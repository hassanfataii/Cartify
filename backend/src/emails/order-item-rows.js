import { escapeHtml } from "./email-layout.js";

function publicImageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function createOrderItemRows(order, { formatCurrency, showPrices = true } = {}) {
  return (order.items || []).map((item) => {
    const image = publicImageUrl(item.image);
    const thumbnail = image ? `<img src="${escapeHtml(image)}" alt="" width="64" height="64" style="display:block;width:64px;height:64px;object-fit:contain;border-radius:8px;background:#f8f6fc;" />` : "";
    const quantity = Number(item.quantity) || 0;
    const unitPrice = showPrices ? ` × ${formatCurrency(item.unitPriceInPence, order.currency)}` : "";
    const total = showPrices ? `<td align="right" style="padding:14px 0 14px 8px;border-bottom:1px solid #ece8f2;color:#272238;font-weight:700;white-space:nowrap;">${formatCurrency(item.lineTotalInPence, order.currency)}</td>` : "";

    return `<tr>
      <td width="72" valign="middle" style="padding:14px 8px 14px 0;border-bottom:1px solid #ece8f2;">${thumbnail}</td>
      <td valign="middle" style="padding:14px 0;border-bottom:1px solid #ece8f2;">
        <strong style="display:block;color:#272238;">${escapeHtml(item.title)}</strong>
        <span style="color:#716b7e;font-size:14px;">Quantity: ${quantity}${unitPrice}</span>
      </td>${total}
    </tr>`;
  }).join("");
}
