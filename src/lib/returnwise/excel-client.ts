import { STANDARD_COLUMNS } from "./cleaning";

export async function downloadTemplate() {
  const XLSX = await import("xlsx");
  const rows = [
    ["Amazon", "402-1234567", "FSH-KUR-01", "Cotton Kurti Blue", "Fashion", "2026-10-03", 799, 1, 10, "COD", "Standard", "Returned", "2026-10-09", 1, "size chota hai", "Jaipur"],
    ["Flipkart", "OD12345678", "ELC-EAR-01", "Wireless Earbuds Pro", "Electronics", "05/10/2026", 1899, 1, 0, "Prepaid", "Express", "Not Returned", "", "", "", "Pune"],
    ["Meesho", "MS998877", "HOM-LMP-01", "Ceramic Table Lamp", "Home Decor", "12 Oct 2026", 1499, 2, 5, "COD", "Standard", "Returned", "2026-10-18", 1, "Box crushed, lamp toota hua", "Delhi"],
  ];
  const ws = XLSX.utils.aoa_to_sheet([[...STANDARD_COLUMNS], ...rows]);
  ws["!cols"] = STANDARD_COLUMNS.map((c) => ({ wch: Math.max(12, c.length + 2) }));
  const notes = XLSX.utils.aoa_to_sheet([
    ["ReturnWise template notes"],
    ["One row = one order line. Leave return columns blank when not returned."],
    ["Required: Platform, Order_ID, Product_ID, Product_Name, Product_Category, Order_Date, Price, Quantity, Return_Status"],
    ["Platform: Amazon / Flipkart / Meesho. Payment_Type: COD / Prepaid. Return_Status: Returned / Not Returned"],
    ["Discount_Applied is a percent from 0 to 100. City is optional."],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Orders");
  XLSX.utils.book_append_sheet(wb, notes, "Notes");
  XLSX.writeFile(wb, "ReturnWise-template.xlsx");
}

export async function downloadProblems(problems: { file_name: string; row_number: number; kind: string; reason: string }[]) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(problems.map((p) => ({
    File: p.file_name, Row: p.row_number, Type: p.kind === "rejected" ? "Rejected" : "Flagged (kept)", Reason: p.reason,
  })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rejected and flagged");
  XLSX.writeFile(wb, "ReturnWise-rejected-rows.xlsx");
}
