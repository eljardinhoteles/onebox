import dayjs from 'dayjs';

interface Item {
    nombre: string;
    monto?: number;
    con_iva: boolean;
    cantidad?: number;
    valor?: number;
}

export const calculateTransactionTotals = (items: Item[]) => {
    let subtotal = 0;
    let iva = 0;

    items.forEach((item) => {
        // If the UI provides valor and cantidad, multiply them. Otherwise, fall back to monto (old behavior).
        const itemTotal = (item.valor !== undefined && item.cantidad !== undefined)
            ? (Number(item.valor) * Number(item.cantidad))
            : (Number(item.monto) || 0);

        const base = itemTotal;
        if (item.con_iva) {
            const itemIva = Number((base * 0.15).toFixed(4));
            subtotal += base;
            iva += itemIva;
        } else {
            subtotal += base;
        }
    });

    return {
        subtotal: Number(Number(subtotal).toFixed(2)),
        iva: Number(Number(iva).toFixed(2)),
        total: Number((Number(subtotal) + Number(iva)).toFixed(2)),
    };
};

export const printReceipt = (cajaId: number, fechaFactura: Date, items: Item[], total: number, sucursal?: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const fecha = dayjs(fechaFactura).format('DD/MM/YYYY');
    const itemsHtml = items.map((item) => {
        const qty = item.cantidad ?? 1;
        const vlr = item.valor !== undefined ? item.valor : (item.monto || 0);
        const itemTotal = qty * vlr;

        return `
        <tr>
            <td style="padding: 4px 2px; border-bottom: 1px solid #eee; text-align: center;">${qty}</td>
            <td style="padding: 4px 2px; border-bottom: 1px solid #eee;">${item.nombre}</td>
            <td style="padding: 4px 2px; border-bottom: 1px solid #eee; text-align: right;">${Number(vlr).toFixed(2)}</td>
            <td style="padding: 4px 2px; border-bottom: 1px solid #eee; text-align: right;">${itemTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
    <html>
        <head>
            <title>Recibo de Caja - Sin Factura</title>
            <style>
                body { font-family: 'Courier New', Courier, monospace; width: 80mm; margin: 0 auto; color: #333; }
                .ticket { padding: 10px; }
                h2 { text-align: center; margin: 0; font-size: 16px; text-transform: uppercase; }
                .info { margin-top: 10px; font-size: 11px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
                .total { margin-top: 15px; border-top: 2px dashed #000; padding-top: 5px; text-align: right; font-weight: bold; font-size: 13px; }
                .signatures { margin-top: 50px; display: flex; flex-direction: column; gap: 40px; align-items: center; font-size: 10px; }
                .sig-line { width: 150px; border-top: 1px solid #000; text-align: center; padding-top: 2px; }
                @media print {
                    body { width: 100%; margin: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="ticket">
                <h2>COMPROBANTE DE EGRESO</h2>
                <div style="text-align: center; font-size: 9px;">(DOCUMENTO INTERNO - SIN FACTURA)</div>

                <div class="info">
                    ${sucursal ? `<div><b>SUCURSAL:</b> ${sucursal}</div>` : ''}
                    <div><b>FECHA:</b> ${fecha}</div>
                    <div><b>CAJA NO:</b> ${cajaId}</div>
                    <div><b>DETALLE DE GASTOS:</b></div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="padding: 4px 2px; border-bottom: 1px solid #000; text-align: center; width: 10%;">CANT</th>
                            <th style="padding: 4px 2px; border-bottom: 1px solid #000; text-align: left; width: 50%;">DESCRIPCIÓN</th>
                            <th style="padding: 4px 2px; border-bottom: 1px solid #000; text-align: right; width: 20%;">V.UNIT</th>
                            <th style="padding: 4px 2px; border-bottom: 1px solid #000; text-align: right; width: 20%;">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>

                <div class="total">
                    TOTAL PAGADO: $${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>

                <div class="signatures">
                    <div class="sig-line">ENTREGADO CONFORME</div>
                    <div class="sig-line">RECIBE CONFORME (FIRMA)</div>
                </div>
            </div>
            <script>
                window.onload = function() {
                    window.print();
                }
            </script>
        </body>
    </html>
  `);
    printWindow.document.close();
};
