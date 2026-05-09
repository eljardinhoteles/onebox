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
            <td style="padding: 2px 0; border-bottom: 1px solid #000; text-align: center;">${qty}</td>
            <td style="padding: 2px 5px; border-bottom: 1px solid #000;">${item.nombre}</td>
            <td style="padding: 2px 0; border-bottom: 1px solid #000; text-align: right;">${Number(vlr).toFixed(2)}</td>
            <td style="padding: 2px 0; border-bottom: 1px solid #000; text-align: right;">${itemTotal.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Recibo de Caja - Egreso</title>
            <style>
                /* Configuración para Impresoras POS */
                @page { margin: 0; size: auto; }
                * { box-sizing: border-box; }
                
                body { 
                    font-family: 'Courier New', Courier, monospace; 
                    width: 80mm;
                    margin: 0; 
                    padding: 5mm;
                    color: #000 !important;
                    background-color: #fff;
                    font-weight: bold; /* Todo grueso para tono uniforme y legible */
                    
                    /* Forzar nitidez máxima */
                    -webkit-font-smoothing: none;
                    font-smooth: never;
                    text-rendering: optimizeSpeed;
                }

                .ticket { width: 100%; }
                
                h2 { 
                    text-align: center; 
                    margin: 0 0 5px 0; 
                    font-size: 16pt; 
                    text-transform: uppercase;
                }

                .subtitle { 
                    text-align: center; 
                    font-size: 9pt; 
                    margin-bottom: 10px; 
                    border-bottom: 2px dashed #000; 
                    padding-bottom: 5px;
                    line-height: 1.1;
                }

                .info { 
                    margin-bottom: 10px; 
                    font-size: 11pt; 
                    line-height: 1.3; 
                }

                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-top: 5px; 
                    font-size: 10pt; 
                }

                th { 
                    border-bottom: 2px solid #000; 
                    padding: 2px 0; 
                }

                .total { 
                    margin-top: 15px; 
                    border-top: 3px solid #000; 
                    padding-top: 5px; 
                    text-align: right; 
                    font-size: 14pt; 
                }

                .signatures { 
                    margin-top: 70px; 
                    display: flex; 
                    flex-direction: column; 
                    gap: 40px; 
                    align-items: center; 
                    font-size: 10pt; 
                }

                .sig-line { 
                    width: 80%; 
                    border-top: 2px solid #000; 
                    text-align: center; 
                    padding-top: 4px; 
                }

                @media print {
                    body { 
                        width: 80mm; 
                        padding: 0; 
                        margin: 0 auto; 
                    }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="ticket">
                <h2>Comprobante Egreso</h2>
                <div class="subtitle">(DOCUMENTO INTERNO - SIN VALIDEZ TRIBUTARIA)</div>

                <div class="info">
                    ${sucursal ? `<div>SUCURSAL: ${sucursal}</div>` : ''}
                    <div>FECHA: ${fecha}</div>
                    <div>CAJA NO: ${cajaId}</div>
                    <div style="margin-top: 5px; border-top: 1px solid #000; padding-top: 5px;">DETALLE DE GASTO:</div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="text-align: center; width: 10%;">CT</th>
                            <th style="text-align: left; width: 50%;">DESCRIPCIÓN</th>
                            <th style="text-align: right; width: 20%;">V.U</th>
                            <th style="text-align: right; width: 20%;">TOT</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>

                <div class="total">
                    TOTAL PAGADO: $${total.toFixed(2)}
                </div>

                <div class="signatures">
                    <div class="sig-line">RECIBIDO CONFORME (FIRMA)</div>
                </div>
            </div>
            <script>
                window.onload = function() {
                    // Pequeña espera para asegurar renderizado antes de imprimir
                    setTimeout(() => {
                        window.print();
                        // Opcional: cerrar la ventana después de imprimir
                        // window.close();
                    }, 300);
                }
            </script>
        </body>
    </html>
  `);
    printWindow.document.close();
};
