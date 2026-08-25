export interface PagoDetalleExport {
    proveedor: {
        ruc: string;
        nombre: string;
        tipo_cuenta?: string;
        numero_cuenta?: string;
        codigo_banco?: string;
    };
    valor_factura: number;
    referencia: string;
    tipo_id?: string;
}

/**
 * Limpia el texto de acentos y caracteres especiales que suelen causar problemas en los bancos.
 */
function cleanText(text: string): string {
    if (!text) return '';
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

/**
 * Genera el contenido TSV para Cash Management en base a los detalles de una orden de pago.
 */
export function generateCashManagementTSV(detalles: PagoDetalleExport[]): string {
    const rows = detalles.map(detalle => {
        const prov = detalle.proveedor || ({} as any);

        // 1. Tipo: PA
        const tipo = 'PA';

        // 2. Contrapartida: RUC o Cédula
        const contrapartida = prov.ruc || '';

        // 3. Moneda: USD
        const moneda = 'USD';

        // 4. Valor: número sin decimales (ej. 15.50 -> 1550)
        const valor = Math.round(detalle.valor_factura * 100).toString();

        // 5. Forma de Pago: CTA
        const formaPago = 'CTA';

        // 6. Tipo de Cuenta: AHO o CTE
        let tipoCuenta = '';
        if (prov.tipo_cuenta) {
            const t = prov.tipo_cuenta.toLowerCase();
            if (t.includes('ahorro')) tipoCuenta = 'AHO';
            else if (t.includes('corriente')) tipoCuenta = 'CTE';
            else tipoCuenta = t.substring(0, 3).toUpperCase();
        }

        // 7. Número de Cuenta
        const numeroCuenta = prov.numero_cuenta || '';

        // 8. Referencia de Pago (max 40 caracteres)
        const referencia = cleanText(detalle.referencia).substring(0, 40);

        // 9. Tipo ID: C / R / P
        // 10. Número ID: RUC sin el 001 si es RUC, o cédula
        let tipoId = detalle.tipo_id || 'C';
        let numeroId = prov.ruc || '';
        
        // El banco exige que la Cédula tenga 10 dígitos. 
        // Si se eligió RUC (R), mantenemos los 13 dígitos.
        if (tipoId === 'C' && numeroId.length > 10) {
            numeroId = numeroId.substring(0, 10);
        } else if (!detalle.tipo_id) {
            // Autodetección de respaldo si tipo_id no viene definido
            if (numeroId.length === 13) {
                tipoId = 'R';
                // numeroId se mantiene igual (13 dígitos)
            } else if (numeroId.length === 10) {
                tipoId = 'C';
            } else if (numeroId.length > 0 && numeroId.length < 10) {
                tipoId = 'P'; // Asumiendo pasaporte si no es 10 ni 13
            }
        }

        // 11. Nombre Beneficiario (max 40 caracteres)
        const nombreBeneficiario = cleanText(prov.nombre).substring(0, 40);

        // 12. Código de Banco
        const codigoBanco = prov.codigo_banco || '';

        // Unir columnas con tabulador
        return [
            tipo,
            contrapartida,
            moneda,
            valor,
            formaPago,
            tipoCuenta,
            numeroCuenta,
            referencia,
            tipoId,
            numeroId,
            nombreBeneficiario,
            codigoBanco
        ].join('\t');
    });

    // Los bancos suelen requerir saltos de línea Windows (CRLF)
    return rows.join('\r\n');
}

/**
 * Descarga un texto como archivo TSV en el navegador
 */
export function downloadTSV(content: string, filename: string) {
    // Usar Base64 hace que el Data URI sea 100% seguro contra saltos de línea o espacios
    // que a veces rompen el atributo 'download' en ciertos navegadores.
    const base64Content = btoa(unescape(encodeURIComponent(content)));
    const encodedUri = 'data:text/plain;base64,' + base64Content;
    
    const link = document.createElement('a');
    link.href = encodedUri;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
