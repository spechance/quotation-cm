import { COMPANY_INFO } from "@/lib/constants";
import { formatNumber, formatDate } from "@/lib/utils";

interface PdfItem {
  itemNumber: number;
  description: string;
  specification: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
}

interface PdfService {
  sectionLabel: string;
  sectionTitle: string;
  period: string;
  quantity: string;
  subtotal: number;
  terms: string[];
  items: PdfItem[];
}

interface PdfQuotation {
  quotationNumber: string;
  quotationDate: string | Date;
  projectName: string;
  companyName: string;
  contactAddress: string;
  primaryContact: string;
  projectPeriod: string;
  companyTaxId: string;
  companyPhone: string;
  contactPhone: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  generalTerms: string[];
  services: PdfService[];
  salesName?: string;
  salesPhone?: string;
  stampTextA?: string;
  stampTextB?: string;
}

export function renderQuotationHtml(data: PdfQuotation): string {
  const date = formatDate(data.quotationDate);
  // Build title from service types
  const serviceNames = data.services.map((s) => s.sectionTitle).join("、");
  const title = `全偲行銷-${data.services.length === 1 ? data.services[0].sectionTitle.replace("操作", "") : "綜合"}報價單`;

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Noto Sans TC', 'Microsoft JhengHei', sans-serif;
    font-size: 10px;
    line-height: 1.5;
    color: #111;
  }
  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 15mm 15mm 20mm 15mm;
    position: relative;
  }

  /* Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 15px;
    border-bottom: 2px solid #111111;
    padding-bottom: 10px;
  }
  .header-left { display: flex; align-items: center; gap: 10px; }
  .logo-placeholder {
    width: 40px; height: 40px;
    background: #111111; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    color: white; font-weight: bold; font-size: 16px;
  }
  .header-title { font-size: 18px; font-weight: 700; color: #111111; }
  .header-date { font-size: 10px; color: #666; text-align: right; }

  /* Client Info */
  .client-info {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 15px;
    border: 1px solid #ddd;
  }
  .client-info td {
    padding: 6px 10px;
    border: 1px solid #ddd;
    font-size: 10px;
  }
  .client-info .label {
    background: #f8f9fa;
    font-weight: 700;
    width: 80px;
    white-space: nowrap;
  }

  /* Service Section */
  .section-header {
    background: #111111;
    color: white;
    padding: 8px 12px;
    font-size: 13px;
    font-weight: 700;
    margin-top: 15px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .section-meta {
    display: flex;
    gap: 20px;
    font-size: 10px;
    color: #555;
    padding: 5px 12px;
    background: #f0f4ff;
    border: 1px solid #ddd;
    border-top: none;
  }

  /* Items Table */
  .items-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #ddd;
    border-top: none;
  }
  .items-table th {
    background: #f8f9fa;
    padding: 6px 8px;
    border: 1px solid #ddd;
    font-size: 9px;
    font-weight: 700;
    text-align: center;
    color: #555;
  }
  .items-table td {
    padding: 6px 8px;
    border: 1px solid #ddd;
    font-size: 10px;
    vertical-align: top;
  }
  .items-table .num { text-align: center; width: 30px; }
  .items-table .amount { text-align: right; white-space: nowrap; }
  .items-table .qty { text-align: center; width: 50px; }
  .items-table .unit { text-align: center; width: 40px; }
  .items-table .spec { font-size: 9px; color: #555; white-space: pre-line; }

  /* Terms */
  .terms {
    margin-top: 10px;
    padding: 8px 12px;
    background: #fafafa;
    border: 1px solid #eee;
    border-radius: 4px;
  }
  .terms p {
    font-size: 8px;
    color: #555;
    line-height: 1.6;
    margin-bottom: 2px;
  }

  /* Financial Summary */
  .financial {
    margin-top: 15px;
    width: 300px;
    margin-left: auto;
    border-collapse: collapse;
  }
  .financial td {
    padding: 6px 12px;
    font-size: 11px;
    border: 1px solid #ddd;
  }
  .financial .label-cell { background: #f8f9fa; font-weight: 500; }
  .financial .amount-cell { text-align: right; font-weight: 700; }
  .financial .total-row td {
    background: #111111;
    color: white;
    font-size: 12px;
    font-weight: 700;
  }

  /* General Terms */
  .general-terms {
    margin-top: 15px;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  .general-terms h4 {
    font-size: 10px;
    font-weight: 700;
    margin-bottom: 6px;
    color: #333;
  }
  .general-terms p {
    font-size: 7.5px;
    color: #555;
    line-height: 1.6;
    margin-bottom: 1px;
  }

  /* Signature */
  .signature-area {
    display: flex;
    justify-content: space-between;
    margin-top: 25px;
    gap: 30px;
  }
  .sig-box {
    flex: 1;
    border: 1px solid #ddd;
    padding: 15px 20px;
    min-height: 100px;
  }
  .sig-box .sig-title {
    font-size: 10px;
    font-weight: 700;
    margin-bottom: 40px;
  }
  .sig-box .sig-stamp {
    font-size: 10px;
    color: #666;
    text-align: center;
    margin-top: 10px;
  }

  /* Footer */
  .footer {
    margin-top: 15px;
    text-align: center;
    font-size: 9px;
    color: #666;
    border-top: 1px solid #ddd;
    padding-top: 8px;
  }
</style>
</head>
<body>
<div class="page">
  <!-- Banner：替換為全偲 Banner，將圖片放到 public/banner.png -->
  <div style="text-align: center; margin-bottom: 10px;">
    <img src="${process.env.AUTH_URL || "http://localhost:3000"}/banner.png" style="max-width: 100%; height: auto; max-height: 60px;" onerror="this.style.display='none'" />
  </div>

  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <img src="${process.env.AUTH_URL || "http://localhost:3000"}/logo.png" style="height: 36px; width: auto;" onerror="this.style.display='none'" />
      <div>
        <div style="font-size: 11px; font-weight: 700; color: #333;">CHANCE MARKETING</div>
      </div>
    </div>
    <div style="text-align: right;">
      <div class="header-title">${title}</div>
      <div class="header-date">報價日期：${date}</div>
    </div>
  </div>

  <!-- Client Info -->
  <table class="client-info">
    <tr>
      <td class="label">專案名稱</td>
      <td>${data.projectName}</td>
      <td class="label">專案走期</td>
      <td>${data.projectPeriod || ""}</td>
    </tr>
    <tr>
      <td class="label">公司名稱</td>
      <td>${data.companyName}</td>
      <td class="label">公司統編</td>
      <td>${data.companyTaxId || ""}</td>
    </tr>
    <tr>
      <td class="label">聯絡地址</td>
      <td>${data.contactAddress || ""}</td>
      <td class="label">公司電話</td>
      <td>${data.companyPhone || ""}</td>
    </tr>
    <tr>
      <td class="label">主要窗口</td>
      <td>${data.primaryContact}</td>
      <td class="label">窗口電話</td>
      <td>${data.contactPhone || ""}</td>
    </tr>
  </table>

  <!-- Service Sections -->
  ${data.services
    .map(
      (service) => `
    <div class="section-header">
      <span>${service.sectionLabel}　${service.sectionTitle}</span>
      <span style="font-size: 10px;">小計 $${formatNumber(service.subtotal)}</span>
    </div>
    ${
      service.period || service.quantity
        ? `<div class="section-meta">
        ${service.period ? `<span>走期：${service.period}</span>` : ""}
        ${service.quantity ? `<span>數量：${service.quantity}</span>` : ""}
      </div>`
        : ""
    }
    <table class="items-table">
      <thead>
        <tr>
          <th class="num">#</th>
          <th>項目</th>
          <th>規格說明</th>
          <th class="qty">數量</th>
          <th class="unit">單位</th>
          <th class="amount">單價</th>
          <th class="amount">小計</th>
        </tr>
      </thead>
      <tbody>
        ${service.items
          .map(
            (item) => `
          <tr>
            <td class="num">${item.itemNumber}</td>
            <td>${item.description}</td>
            <td class="spec">${item.specification || ""}</td>
            <td class="qty">${item.quantity}</td>
            <td class="unit">${item.unit || ""}</td>
            <td class="amount">$${formatNumber(item.unitPrice)}</td>
            <td class="amount">$${formatNumber(item.amount)}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
    ${
      service.terms.length > 0
        ? `<div class="terms">
        ${service.terms.map((t) => `<p>${t}</p>`).join("")}
      </div>`
        : ""
    }
  `
    )
    .join("")}

  <!-- Financial Summary -->
  <table class="financial">
    <tr>
      <td class="label-cell">小計 上述項目各單價之總和</td>
      <td class="amount-cell">$${formatNumber(data.subtotal)}</td>
    </tr>
    <tr>
      <td class="label-cell">營業稅 5%</td>
      <td class="amount-cell">$${formatNumber(data.taxAmount)}</td>
    </tr>
    <tr class="total-row">
      <td>總額 含稅總價</td>
      <td class="amount-cell">$${formatNumber(data.totalAmount)}</td>
    </tr>
  </table>

  <!-- General Terms -->
  ${
    data.generalTerms.length > 0
      ? `<div class="general-terms">
      ${data.generalTerms.map((t) => `<p>${t.replace(/\n/g, "<br/>")}</p>`).join("")}
    </div>`
      : ""
  }

  <!-- Signature Area -->
  <div class="signature-area">
    <div class="sig-box">
      <div class="sig-title">甲方：客戶簽核</div>
      <div class="sig-stamp">${data.stampTextA || "發票章用印"}</div>
    </div>
    <div class="sig-box">
      <div class="sig-title">乙方：全偲行銷簽核</div>
      <div class="sig-stamp">${data.stampTextB || "發票章用印"}</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    ${COMPANY_INFO.name} ${COMPANY_INFO.nameEn} 地址 ${COMPANY_INFO.address}<br>
    統編: ${COMPANY_INFO.taxId} 電話:${COMPANY_INFO.phone} 業務：${data.salesName || ""} 手機：${data.salesPhone || ""}
  </div>
</div>
</body>
</html>`;
}
