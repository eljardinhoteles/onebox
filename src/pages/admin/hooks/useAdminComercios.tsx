import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { useEmpresa } from '../../../context/EmpresaContext';
import dayjs from 'dayjs';
import type { Comercio } from '../types';
import { Text, Stack, Select, NumberInput, Alert, Button } from '@mantine/core';
import { IconExternalLink, IconAlertTriangle } from '@tabler/icons-react';
import { usePlanesConfig } from '../../../hooks/usePlanesConfig';

export function useAdminComercios() {
    const { isSuperAdmin } = useEmpresa();
    const { precios } = usePlanesConfig();
    const [comercios, setComercios] = useState<Comercio[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('todos');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [drawerVersion, setDrawerVersion] = useState(0);
    const ITEMS_PER_PAGE = 30;

    const fetchComercios = async () => {
        setLoading(true);
        try {
            const { data: subs, error } = await supabase
                .from('suscripciones')
                .select('*, empresas:empresa_id(nombre, ruc)')
                .order('fecha_fin', { ascending: true });

            if (error) throw error;

            // Obtener todos los pagos aprobados de la bitácora para calcular facturación
            const { data: pagos } = await supabase
                .from('bitacora')
                .select('empresa_id, detalle')
                .eq('accion', 'PAGO_APROBADO');

            const mapped = (subs || []).map((s: any) => {
                const merchantPagos = (pagos || []).filter(p => p.empresa_id === s.empresa_id);
                const totalDirecto = merchantPagos.reduce((sum, p) => sum + (Number(p.detalle?.monto) || 0), 0);
                
                return {
                    id: s.id,
                    empresa_id: s.empresa_id,
                    empresa_nombre: s.empresas?.nombre || 'Sin nombre',
                    empresa_ruc: s.empresas?.ruc || null,
                    plan: s.plan,
                    estado: s.estado,
                    fecha_inicio: s.fecha_inicio,
                    fecha_fin: s.fecha_fin,
                    metodo_pago: s.metodo_pago,
                    comprobante_url: s.comprobante_url,
                    notas_admin: s.notas_admin,
                    factura_emitida: s.factura_emitida === true,
                    total_pagado: totalDirecto,
                    upgrade_pendiente: s.upgrade_pendiente,
                    upgrade_plan: s.upgrade_plan,
                    upgrade_comprobante_url: s.upgrade_comprobante_url
                };
            });
            
            setComercios(mapped);
        } catch (err: any) {
            notifications.show({ title: 'Error', message: err.message, color: 'red' });
        } finally {
            setLoading(false);
            setDrawerVersion(v => v + 1);
        }
    };

    useEffect(() => {
        if (isSuperAdmin) {
            fetchComercios();
        }
    }, [isSuperAdmin]);

    const handleApproveClick = (sub: Comercio) => {
        let plan = sub.plan;
        let monto = sub.plan === 'anual' ? precios.anual : precios.mensual;

        modals.openConfirmModal({
            title: <Text fw={700}>Aprobar Pago: {sub.empresa_nombre}</Text>,
            centered: true,
            children: (
                <Stack gap="md" mt="sm">
                    <Select
                        label="Plan a activar"
                        data={[
                            { value: 'mensual', label: 'Mensual' },
                            { value: 'anual', label: 'Anual' }
                        ]}
                        defaultValue={plan}
                        onChange={(v) => { if (v) plan = v; }}
                    />
                    <NumberInput
                        label="Monto Cobrado (USD)"
                        description="Ingresa el valor real cobrado."
                        defaultValue={monto}
                        prefix="$"
                        min={0}
                        onChange={(v) => monto = Number(v)}
                    />
                </Stack>
            ),
            labels: { confirm: 'Aprobar y Activar', cancel: 'Cancelar' },
            confirmProps: { color: 'teal' },
            onConfirm: async () => {
                const planDays = plan === 'anual' ? 365 : 30;
                const newEnd = dayjs().add(planDays, 'day').toISOString();

                const { error } = await supabase
                    .from('suscripciones')
                    .update({
                        plan: plan,
                        estado: 'activa',
                        fecha_inicio: new Date().toISOString(),
                        fecha_fin: newEnd,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', sub.id);

                if (error) {
                    notifications.show({ title: 'Error', message: error.message, color: 'red' });
                } else {
                    await supabase.from('bitacora').insert({
                        empresa_id: sub.empresa_id,
                        user_id: (await supabase.auth.getUser()).data.user?.id,
                        accion: 'PAGO_APROBADO',
                        detalle: { plan, monto, fecha_fin: newEnd, metodo: sub.metodo_pago }
                    });
                    notifications.show({ title: 'Aprobado', message: `Suscripción activada exitosamente.`, color: 'teal' });
                    fetchComercios();
                }
            }
        });
    };

    const handleApproveUpgrade = (sub: Comercio) => {
        const newPlan = sub.upgrade_plan || 'anual';
        let monto = newPlan === 'anual' ? precios.anual : precios.mensual;

        modals.openConfirmModal({
            title: <Text fw={700}>Aprobar Upgrade: {sub.empresa_nombre}</Text>,
            centered: true,
            children: (
                <Stack gap="md" mt="sm">
                    <Alert variant="light" color="teal" title="Upgrade pendiente">
                        El cliente solicita pasar de <strong>{sub.plan}</strong> → <strong>{newPlan}</strong>.
                        Su suscripción actual sigue activa.
                    </Alert>
                    {sub.upgrade_comprobante_url && (
                        <Button
                            variant="light"
                            color="blue"
                            size="xs"
                            radius="md"
                            leftSection={<IconExternalLink size={14} />}
                            onClick={() => window.open(sub.upgrade_comprobante_url!, '_blank')}
                        >
                            Ver comprobante de upgrade
                        </Button>
                    )}
                    <NumberInput
                        label="Monto cobrado (USD)"
                        defaultValue={monto}
                        prefix="$"
                        min={0}
                        onChange={(v) => { monto = Number(v); }}
                    />
                </Stack>
            ),
            labels: { confirm: 'Aprobar Upgrade', cancel: 'Cancelar' },
            confirmProps: { color: 'teal' },
            onConfirm: async () => {
                const planDays: Record<string, number> = { mensual: 30, anual: 365 };
                const days = planDays[newPlan] || 30;
                const newEnd = dayjs().add(days, 'day').toISOString();

                // Actualizar optimistamente
                setComercios(prev => prev.map(c => c.id === sub.id
                    ? { ...c, plan: newPlan, estado: 'activa', fecha_fin: newEnd, upgrade_pendiente: false, upgrade_plan: null, upgrade_comprobante_url: null }
                    : c
                ));

                const { error } = await supabase
                    .from('suscripciones')
                    .update({
                        plan: newPlan,
                        estado: 'activa',
                        fecha_inicio: new Date().toISOString(),
                        fecha_fin: newEnd,
                        upgrade_pendiente: false,
                        upgrade_plan: null,
                        upgrade_comprobante_url: null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', sub.id);

                if (error) {
                    notifications.show({ title: 'Error', message: error.message, color: 'red' });
                    fetchComercios();
                } else {
                    await supabase.from('bitacora').insert({
                        empresa_id: sub.empresa_id,
                        user_id: (await supabase.auth.getUser()).data.user?.id,
                        accion: 'UPGRADE_APROBADO',
                        detalle: { plan_anterior: sub.plan, plan_nuevo: newPlan, monto, fecha_fin: newEnd }
                    });
                    notifications.show({ title: 'Upgrade aprobado', message: `${sub.empresa_nombre} actualizado a plan ${newPlan}.`, color: 'teal' });
                    fetchComercios();
                }
            }
        });
    };

    const handleReject = async (sub: Comercio) => {
        const { error } = await supabase
            .from('suscripciones')
            .update({
                estado: sub.plan === 'trial' ? 'trial' : 'vencida',
                metodo_pago: null,
                comprobante_url: null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', sub.id);

        if (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } else {
            // Registrar en bitácora
            await supabase.from('bitacora').insert({
                empresa_id: sub.empresa_id,
                user_id: (await supabase.auth.getUser()).data.user?.id,
                accion: 'PAGO_RECHAZADO',
                detalle: {
                    plan: sub.plan,
                    motivo: 'Comprobante inválido o no verificado'
                }
            });

            notifications.show({ title: 'Rechazado', message: 'El pago ha sido rechazado y el comprobante eliminado.', color: 'orange' });
            fetchComercios();
        }
    };

    const handleChangePlanClick = (sub: Comercio) => {
        let newPlan = sub.plan === 'anual' ? 'mensual' : 'anual';
        let monto = newPlan === 'anual' ? precios.anual : precios.mensual;

        modals.openConfirmModal({
            title: <Text fw={700}>Cambiar Plan: {sub.empresa_nombre}</Text>,
            centered: true,
            children: (
                <Stack gap="md" mt="sm">
                    <Alert variant="light" color="blue" title="Cambio de plan">
                        Plan actual: <strong>{sub.plan}</strong>. Asegúrate de haber recibido el pago antes de confirmar.
                    </Alert>
                    <Select
                        label="Nuevo plan"
                        data={[
                            { value: 'trial', label: 'Trial (14 días)' },
                            { value: 'mensual', label: `Mensual — $${precios.mensual}/mes` },
                            { value: 'anual', label: `Anual — $${precios.anual}/año` },
                        ]}
                        defaultValue={newPlan}
                        onChange={(v) => { if (v) { newPlan = v; monto = v === 'anual' ? precios.anual : v === 'mensual' ? precios.mensual : 0; } }}
                    />
                    <NumberInput
                        label="Monto cobrado por el upgrade (USD)"
                        description="Ingresa el valor real recibido del cliente."
                        defaultValue={monto}
                        prefix="$"
                        min={0}
                        onChange={(v) => { monto = Number(v); }}
                    />
                </Stack>
            ),
            labels: { confirm: 'Confirmar Cambio', cancel: 'Cancelar' },
            confirmProps: { color: 'blue' },
            onConfirm: async () => {
                const planDays: Record<string, number> = { trial: 14, mensual: 30, anual: 365 };
                const days = planDays[newPlan] || 30;
                const newEnd = dayjs().add(days, 'day').toISOString();

                // Actualizar optimistamente en UI
                setComercios(prev => prev.map(c => c.id === sub.id
                    ? { ...c, plan: newPlan, estado: newPlan === 'trial' ? 'trial' : 'activa', fecha_fin: newEnd }
                    : c
                ));

                const { error } = await supabase
                    .from('suscripciones')
                    .update({
                        plan: newPlan,
                        estado: newPlan === 'trial' ? 'trial' : 'activa',
                        fecha_inicio: new Date().toISOString(),
                        fecha_fin: newEnd,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', sub.id);

                if (error) {
                    notifications.show({ title: 'Error', message: error.message, color: 'red' });
                    fetchComercios(); // Revertir
                } else {
                    // Registrar pago en bitácora
                    await supabase.from('bitacora').insert({
                        empresa_id: sub.empresa_id,
                        user_id: (await supabase.auth.getUser()).data.user?.id,
                        accion: 'UPGRADE_PLAN',
                        detalle: {
                            plan_anterior: sub.plan,
                            plan_nuevo: newPlan,
                            monto,
                            fecha_fin: newEnd,
                        }
                    });
                    notifications.show({
                        title: 'Plan actualizado',
                        message: `${sub.empresa_nombre}: ${sub.plan} → ${newPlan}`,
                        color: 'blue'
                    });
                    fetchComercios();
                }
            }
        });
    };

    const handleSuspend = async (sub: Comercio) => {
        const { error } = await supabase
            .from('suscripciones')
            .update({ estado: 'suspendida', updated_at: new Date().toISOString() })
            .eq('id', sub.id);

        if (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } else {
            await supabase.from('bitacora').insert({
                empresa_id: sub.empresa_id,
                user_id: (await supabase.auth.getUser()).data.user?.id,
                accion: 'SUSCRIPCION_SUSPENDIDA',
                detalle: { plan: sub.plan }
            });
            notifications.show({ title: 'Suspendida', message: `${sub.empresa_nombre} suspendida.`, color: 'orange' });
            fetchComercios();
        }
    };

    const handleReactivate = async (sub: Comercio) => {
        const planDays: Record<string, number> = { trial: 14, mensual: 30, anual: 365 };
        const days = planDays[sub.plan] || 30;
        const newEnd = dayjs().add(days, 'day').toISOString();

        const { error } = await supabase
            .from('suscripciones')
            .update({
                estado: sub.plan === 'trial' ? 'trial' : 'activa',
                fecha_fin: newEnd,
                updated_at: new Date().toISOString(),
            })
            .eq('id', sub.id);

        if (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
        } else {
            await supabase.from('bitacora').insert({
                empresa_id: sub.empresa_id,
                user_id: (await supabase.auth.getUser()).data.user?.id,
                accion: 'SUSCRIPCION_REACTIVADA',
                detalle: { plan: sub.plan, nueva_fecha_fin: newEnd }
            });
            notifications.show({ title: 'Reactivada', message: `${sub.empresa_nombre} reactivada hasta ${dayjs(newEnd).format('DD/MM/YYYY')}.`, color: 'teal' });
            fetchComercios();
        }
    };

    const handleDeleteComercio = async (sub: Comercio) => {
        // Verificar si tiene cajas
        const { count: cajasCount } = await supabase
            .from('cajas')
            .select('id', { count: 'exact', head: true })
            .eq('empresa_id', sub.empresa_id);

        // Verificar si tiene transacciones
        const { count: txCount } = await supabase
            .from('transacciones')
            .select('id', { count: 'exact', head: true })
            .eq('empresa_id', sub.empresa_id);

        const hasCajas = (cajasCount || 0) > 0;
        const hasTx = (txCount || 0) > 0;

        if (hasCajas || hasTx) {
            notifications.show({
                title: 'No se puede eliminar',
                message: `${sub.empresa_nombre} tiene ${cajasCount || 0} caja(s) y ${txCount || 0} transacción(es). Solo se pueden eliminar comercios sin actividad.`,
                color: 'red',
            });
            return;
        }

        modals.openConfirmModal({
            title: <Text fw={700}>Eliminar Comercio</Text>,
            centered: true,
            children: (
                <Stack gap="xs">
                    <Text size="sm">¿Estás seguro de que deseas eliminar definitivamente a <b>{sub.empresa_nombre}</b>?</Text>
                    <Alert color="red" variant="light" icon={<IconAlertTriangle size={16} />} py="xs">
                        <Text size="xs">Esta acción eliminará la suscripción, usuarios asociados, sucursales y la empresa. No se puede deshacer.</Text>
                    </Alert>
                </Stack>
            ),
            labels: { confirm: 'Eliminar definitivamente', cancel: 'Cancelar' },
            confirmProps: { color: 'red' },
            onConfirm: async () => {
                await supabase.from('suscripciones').delete().eq('empresa_id', sub.empresa_id);
                await supabase.from('empresa_usuarios').delete().eq('empresa_id', sub.empresa_id);
                await supabase.from('sucursales').delete().eq('empresa_id', sub.empresa_id);
                await supabase.from('bitacora').delete().eq('empresa_id', sub.empresa_id);
                await supabase.from('notificaciones').delete().eq('empresa_id', sub.empresa_id);
                await supabase.from('invitaciones').delete().eq('empresa_id', sub.empresa_id);

                const { error } = await supabase.from('empresas').delete().eq('id', sub.empresa_id);

                if (error) {
                    notifications.show({ title: 'Error al eliminar', message: error.message, color: 'red' });
                } else {
                    notifications.show({ title: 'Eliminado', message: `${sub.empresa_nombre} ha sido eliminado.`, color: 'teal' });
                    fetchComercios();
                }
            },
        });
    };

    const handleToggleFacturaEmitida = async (sub: Comercio, value: boolean) => {
        setComercios(prev => prev.map(c => c.id === sub.id ? { ...c, factura_emitida: value } : c));
        
        const { error } = await supabase
            .from('suscripciones')
            .update({
                factura_emitida: value,
                updated_at: new Date().toISOString()
            })
            .eq('id', sub.id);

        if (error) {
            notifications.show({ title: 'Error', message: error.message, color: 'red' });
            fetchComercios(); // Revertir en caso de fallar
        } else {
            notifications.show({ title: 'Actualizado', message: `Factura de ${sub.empresa_nombre} marcada como ${value ? 'emitida' : 'no emitida'}.`, color: 'teal' });
        }
    };

    const financialTotals = {
        cobrado: comercios.reduce((sum, c) => sum + (c.total_pagado || 0), 0),
        pendiente: comercios
            .filter(c => c.estado === 'pendiente_pago')
            .reduce((sum, c) => sum + (c.plan === 'anual' ? precios.anual : precios.mensual), 0),
        perdido: comercios
            .filter(c => c.estado === 'vencida')
            .reduce((sum) => sum + precios.mensual, 0)
    };

    const filtered = comercios.filter(c => {
        const matchesStatus = filter === 'todos' || c.estado === filter;
        const searchUpper = searchTerm.toUpperCase();
        const matchesSearch = searchTerm === '' || 
            c.empresa_nombre.toUpperCase().includes(searchUpper) || 
            (c.empresa_ruc && c.empresa_ruc.includes(searchTerm));
        
        return matchesStatus && matchesSearch;
    });

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginatedItems = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const counts = [
        { value: 'todos', label: 'Todos', count: comercios.length },
        { value: 'trial', label: 'Trial', count: comercios.filter(c => c.estado === 'trial').length },
        { value: 'activa', label: 'Activa', count: comercios.filter(c => c.estado === 'activa').length },
        { value: 'vencida', label: 'Vencida', count: comercios.filter(c => c.estado === 'vencida').length },
        { value: 'pendiente_pago', label: 'Pendiente', count: comercios.filter(c => c.estado === 'pendiente_pago').length },
        { value: 'suspendida', label: 'Suspendida', count: comercios.filter(c => c.estado === 'suspendida').length },
    ];

    return {
        isSuperAdmin,
        comercios,
        loading,
        filter,
        setFilter,
        searchTerm,
        setSearchTerm,
        currentPage,
        setCurrentPage,
        totalPages,
        paginatedItems,
        financialTotals,
        counts,
        drawerVersion,
        fetchComercios,
        handleApproveClick,
        handleApproveUpgrade,
        handleReject,
        handleChangePlanClick,
        handleSuspend,
        handleReactivate,
        handleDeleteComercio,
        handleToggleFacturaEmitida
    };
}
