export interface Comercio {
    id: string;
    empresa_id: string;
    empresa_nombre: string;
    empresa_ruc: string | null;
    plan: string;
    estado: string;
    fecha_inicio: string;
    fecha_fin: string;
    metodo_pago: string | null;
    comprobante_url: string | null;
    notas_admin: string | null;
    factura_emitida: boolean;
    total_pagado?: number;
    upgrade_pendiente?: boolean;
    upgrade_plan?: string | null;
    upgrade_comprobante_url?: string | null;
    counts?: {
        usuarios: number;
        sucursales: number;
        cajas: number;
    };
}
