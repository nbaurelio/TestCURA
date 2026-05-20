import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SheetData {
  name: string;
  headers: string[];
  rows: (string | number | null)[][];
}

interface ChartCapture {
  id: string;   // DOM element id
  title: string; // label for the chart
  headers?: string[];
  rows?: (string | number | null)[][];
}

// ─── Capture chart elements as base64 PNGs ─────────────────────────────────────

async function captureChart(chart: ChartCapture): Promise<{ title: string; base64: string; width: number; height: number } | null> {
  const el = document.getElementById(chart.id);
  if (!el || el.offsetHeight === 0) return null;
  try {
    const canvas = await html2canvas(el, {
      scale: 1,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      imageTimeout: 3000,
    });
    return {
      title: chart.title,
      base64: canvas.toDataURL("image/jpeg", 0.8).split(",")[1],
      width: canvas.width,
      height: canvas.height,
    };
  } catch { return null; }
}

async function captureCharts(charts: ChartCapture[]): Promise<{ title: string; base64: string; width: number; height: number }[]> {
  // Capture all in parallel for maximum speed
  const captured = await Promise.all(charts.map(captureChart));
  return captured.filter((c): c is NonNullable<typeof c> => c !== null);
}

// ─── Excel Export (with optional chart images) ─────────────────────────────────

export async function exportToExcel(
  sheets: SheetData[],
  filename: string,
  chartIds?: ChartCapture[]
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "CURA";
  wb.created = new Date();

  const HEADER_FILL: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B3A5C" } };
  const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
  const ALT_FILL: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F7FA" } };

  // ── Data sheets ──────────────────────────────────────────────────────────
  sheets.forEach(({ name, headers, rows }) => {
    const ws = wb.addWorksheet(name.substring(0, 31));

    // Header row
    const headerRow = ws.addRow(headers);
    headerRow.eachCell(cell => {
      cell.fill = HEADER_FILL;
      cell.font = HEADER_FONT;
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FF87C4D8" } },
      };
    });
    headerRow.height = 22;

    // Data rows
    rows.forEach((row, idx) => {
      const dataRow = ws.addRow(row.map(v => v ?? "—"));
      dataRow.eachCell(cell => {
        cell.font = { size: 9, color: { argb: "FF3C3C50" } };
        cell.alignment = { vertical: "middle" };
        if (idx % 2 === 0) cell.fill = ALT_FILL;
      });
    });

    // Auto-fit column widths
    ws.columns.forEach((col, i) => {
      const maxLen = Math.max(
        headers[i]?.length || 0,
        ...rows.map(r => String(r[i] ?? "").length)
      );
      col.width = Math.min(maxLen + 4, 40);
    });

    // Freeze header row
    ws.views = [{ state: "frozen", ySplit: 1 }];
  });

  // ── Charts sheet (images + data tables) ─────────────────────────────────
  if (chartIds && chartIds.length > 0) {
    const captured = await captureCharts(chartIds);
    // Build a map of id → captured image
    const captureMap = new Map<string, (typeof captured)[number]>();
    captured.forEach(c => captureMap.set(c.title, c));

    if (captured.length > 0 || chartIds.some(c => c.headers)) {
      const ws = wb.addWorksheet("Charts");

      // Title
      ws.mergeCells("A1:H1");
      const titleCell = ws.getCell("A1");
      titleCell.value = "Dashboard Charts & Data";
      titleCell.font = { bold: true, size: 14, color: { argb: "FF1B3A5C" } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      ws.getRow(1).height = 30;

      let currentRow = 3;
      for (const chartDef of chartIds) {
        const img = captureMap.get(chartDef.title);

        // ── Section title ──────────────────────────────────────────────
        ws.mergeCells(`A${currentRow}:H${currentRow}`);
        const labelCell = ws.getCell(`A${currentRow}`);
        labelCell.value = chartDef.title;
        labelCell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
        labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B3A5C" } } as ExcelJS.FillPattern;
        labelCell.alignment = { horizontal: "left", vertical: "middle" };
        ws.getRow(currentRow).height = 26;
        currentRow += 1;

        // ── Chart image ────────────────────────────────────────────────
        if (img) {
          const imageId = wb.addImage({ base64: img.base64, extension: "jpeg" });
          const maxWidthPx = 700;
          const scale = Math.min(1, maxWidthPx / img.width);
          const displayWidth = Math.round(img.width * scale);
          const displayHeight = Math.round(img.height * scale);

          ws.addImage(imageId, {
            tl: { col: 0, row: currentRow - 1 },
            ext: { width: displayWidth, height: displayHeight },
          });

          const rowsNeeded = Math.ceil(displayHeight / 15) + 1;
          currentRow += rowsNeeded;
        }

        // ── Data table below image ─────────────────────────────────────
        if (chartDef.headers && chartDef.rows && chartDef.rows.length > 0) {
          // "Data" sub-label
          ws.mergeCells(`A${currentRow}:H${currentRow}`);
          const subLabel = ws.getCell(`A${currentRow}`);
          subLabel.value = `${chartDef.title} — Data`;
          subLabel.font = { bold: true, size: 9, color: { argb: "FF1B3A5C" } };
          subLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEBF0F8" } } as ExcelJS.FillPattern;
          subLabel.alignment = { horizontal: "left", vertical: "middle" };
          ws.getRow(currentRow).height = 20;
          currentRow++;

          // Header row
          const hdrRow = ws.getRow(currentRow);
          chartDef.headers.forEach((h, i) => {
            const cell = hdrRow.getCell(i + 1);
            cell.value = h;
            cell.font = { bold: true, size: 9, color: { argb: "FFFFFFFF" } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3D6B8E" } } as ExcelJS.FillPattern;
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.border = { bottom: { style: "thin", color: { argb: "FF87C4D8" } } };
          });
          hdrRow.height = 20;
          currentRow++;

          // Data rows
          chartDef.rows.forEach((row, idx) => {
            const dataRow = ws.getRow(currentRow);
            row.forEach((v, i) => {
              const cell = dataRow.getCell(i + 1);
              cell.value = v ?? "—";
              cell.font = { size: 9, color: { argb: "FF3C3C50" } };
              cell.alignment = { vertical: "middle" };
              if (idx % 2 === 0) {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F7FA" } } as ExcelJS.FillPattern;
              }
            });
            currentRow++;
          });

          currentRow++; // gap after table
        }

        currentRow += 1; // gap between charts
      }

      // Set reasonable column widths
      ws.columns = Array.from({ length: 10 }, () => ({ width: 16 }));
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${filename}.xlsx`);
}

// ─── PDF Export ────────────────────────────────────────────────────────────────

export async function exportDashboardToPDF(
  elementId: string,
  filename: string,
  title: string
) {
  const element = document.getElementById(elementId);
  if (!element) return;

  // Temporarily expand the element for full capture
  const originalOverflow = element.style.overflow;
  const originalHeight = element.style.maxHeight;
  element.style.overflow = "visible";
  element.style.maxHeight = "none";

  const canvas = await html2canvas(element, {
    scale: 1.5,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: Math.min(element.scrollWidth, 1280),
    windowHeight: element.scrollHeight,
  });

  // Restore
  element.style.overflow = originalOverflow;
  element.style.maxHeight = originalHeight;

  const imgData = canvas.toDataURL("image/jpeg", 0.85);
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  // Fit to A4 landscape
  const pdf = new jsPDF({
    orientation: imgWidth > imgHeight ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Header
  pdf.setFillColor(27, 58, 92); // secondary dark blue
  pdf.rect(0, 0, pageWidth, 14, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text(title, 8, 9);
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}`, pageWidth - 8, 9, { align: "right" });

  // Scale image to fit page width, accounting for margins and header
  const margin = 6;
  const headerOffset = 18;
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - headerOffset - margin;
  const scale = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);
  const scaledWidth = imgWidth * scale;
  const scaledHeight = imgHeight * scale;

  // If content fits on one page
  if (scaledHeight <= availableHeight) {
    pdf.addImage(imgData, "JPEG", margin, headerOffset, scaledWidth, scaledHeight);
  } else {
    // Multi-page: slice the image
    const pageContentHeight = availableHeight / scale; // in image pixels
    let yOffset = 0;
    let pageNum = 0;

    while (yOffset < imgHeight) {
      if (pageNum > 0) {
        pdf.addPage();
        // Header on subsequent pages
        pdf.setFillColor(27, 58, 92);
        pdf.rect(0, 0, pageWidth, 14, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.text(`${title} (cont.)`, 8, 9);
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Page ${pageNum + 1}`, pageWidth - 8, 9, { align: "right" });
      }

      // Draw the portion of the image
      const sliceHeight = Math.min(pageContentHeight, imgHeight - yOffset);
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = imgWidth;
      sliceCanvas.height = sliceHeight;
      const ctx = sliceCanvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(canvas, 0, yOffset, imgWidth, sliceHeight, 0, 0, imgWidth, sliceHeight);
        const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.85);
        pdf.addImage(sliceData, "JPEG", margin, headerOffset, scaledWidth, sliceHeight * scale);
      }

      yOffset += pageContentHeight;
      pageNum++;
    }
  }

  // Footer on last page
  pdf.setTextColor(150, 150, 150);
  pdf.setFontSize(6);
  pdf.text("CURA — College of Dentistry Referral Management System", pageWidth / 2, pageHeight - 4, { align: "center" });

  pdf.save(`${filename}.pdf`);
}

// ─── Table data export helper ──────────────────────────────────────────────────

export function exportTableToPDF(
  sheets: SheetData[],
  filename: string,
  title: string
) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  sheets.forEach((sheet, sheetIdx) => {
    if (sheetIdx > 0) pdf.addPage();

    // Header bar
    pdf.setFillColor(27, 58, 92);
    pdf.rect(0, 0, pageWidth, 14, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text(`${title} — ${sheet.name}`, 8, 9);
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "normal");
    pdf.text(
      `Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
      pageWidth - 8, 9, { align: "right" }
    );

    const startY = 20;
    const colCount = sheet.headers.length;
    const colWidth = (pageWidth - 16) / colCount;
    const rowHeight = 6;
    let y = startY;

    // Table header
    pdf.setFillColor(235, 240, 248);
    pdf.rect(8, y, pageWidth - 16, rowHeight + 1, "F");
    pdf.setTextColor(27, 58, 92);
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");
    sheet.headers.forEach((h, i) => {
      pdf.text(h, 10 + i * colWidth, y + 4.5, { maxWidth: colWidth - 2 });
    });
    y += rowHeight + 2;

    // Table rows
    pdf.setFont("helvetica", "normal");
    sheet.rows.forEach((row, rowIdx) => {
      if (y > pageHeight - 12) {
        pdf.addPage();
        y = 10;
        // Re-draw header
        pdf.setFillColor(235, 240, 248);
        pdf.rect(8, y, pageWidth - 16, rowHeight + 1, "F");
        pdf.setTextColor(27, 58, 92);
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "bold");
        sheet.headers.forEach((h, i) => {
          pdf.text(h, 10 + i * colWidth, y + 4.5, { maxWidth: colWidth - 2 });
        });
        y += rowHeight + 2;
        pdf.setFont("helvetica", "normal");
      }

      // Alternate row shading
      if (rowIdx % 2 === 0) {
        pdf.setFillColor(250, 251, 253);
        pdf.rect(8, y, pageWidth - 16, rowHeight, "F");
      }

      pdf.setTextColor(60, 60, 80);
      pdf.setFontSize(6.5);
      row.forEach((cell, i) => {
        const text = String(cell ?? "—");
        pdf.text(text, 10 + i * colWidth, y + 4, { maxWidth: colWidth - 2 });
      });
      y += rowHeight;
    });

    // Footer
    pdf.setTextColor(150, 150, 150);
    pdf.setFontSize(5.5);
    pdf.text("CURA — College of Dentistry Referral Management System", pageWidth / 2, pageHeight - 4, { align: "center" });
  });

  pdf.save(`${filename}.pdf`);
}
