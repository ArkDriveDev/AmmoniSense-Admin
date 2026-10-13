export async function exportReportToPdf(
  element: HTMLElement,
  fileName: string,
  onStart?: () => void,
  onEnd?: () => void,
): Promise<void> {
  onStart?.();
  try {
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas'),
    ]);

    // Give browser and charts a moment to stabilize
    await new Promise<void>((resolve) => setTimeout(resolve, 500));

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      width: element.scrollWidth,
      height: element.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgH = (canvas.height * pageW) / canvas.width;

    let position = 0;
    let remaining = imgH;

    pdf.addImage(imgData, 'PNG', 0, position, pageW, imgH);
    remaining -= pageH;

    while (remaining > 0) {
      position -= pageH;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pageW, imgH);
      remaining -= pageH;
    }

    pdf.save(fileName);
  } finally {
    onEnd?.();
  }
}
