import { useMemo } from 'react';

export interface Transaction {
    id: number;
    fecha_factura: string;
    numero_factura: string;
    total_factura: number;
    tipo_documento: 'factura' | 'nota_venta' | 'sin_factura';
    proveedor: {
        nombre: string;
        ruc: string;
    } | null;
    items?: {
        nombre: string;
        monto: number;
        con_iva: boolean;
        monto_iva: number;
    }[];
    retencion?: {
        id: number;
        numero_retencion: string;
        total_fuente: number;
        total_iva: number;
        total_retenido: number;
    } | null;
    parent_id: number | null;
    es_justificacion: boolean;
}

export function useCajaCalculations(caja: any, transactions: Transaction[]) {
    const totals = useMemo(() => {
        // Solo sumamos transacciones "principales" (parent_id is null) para evitar doble contabilidad
        const mainTransactions = transactions.filter(t => t.parent_id === null);

        const facturado = mainTransactions.reduce((acc, t) => acc + t.total_factura, 0);
        const totalRet = mainTransactions.reduce((acc, t) => acc + (t.retencion?.total_retenido || 0), 0);
        const fuente = mainTransactions.reduce((acc, t) => acc + (t.retencion?.total_fuente || 0), 0);
        const iva = mainTransactions.reduce((acc, t) => acc + (t.retencion?.total_iva || 0), 0);
        const neto = facturado - totalRet;
        const efectivo = (caja?.monto_inicial || 0) - neto;

        return {
            facturado,
            totalRet,
            fuente,
            iva,
            neto,
            efectivo
        };
    }, [transactions, caja?.monto_inicial]);

    return totals;
}
