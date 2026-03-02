/* ═══════════════════════════════════════════════════════════
   FoxAgenda — sw.js  (Service Worker)
   Responsável por agendar e disparar notificações nativas
   com setTimeout preciso, sem polling e sem risco de drift.
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* Map de alertKey → timeoutId  (vive na memória do SW) */
const scheduled = new Map();

/* ── Instalação e ativação imediatas ── */
self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', e  => e.waitUntil(self.clients.claim()));

/* ══════════════════════════════════════════════════════
   RECEBE MENSAGENS DA PÁGINA PRINCIPAL
══════════════════════════════════════════════════════ */
self.addEventListener('message', event => {
  const { type } = event.data;

  /* ── Reagendar TODOS os alertas (chamado no init e após salvar/excluir) ── */
  if (type === 'SCHEDULE_ALERTS') {
    const { alerts } = event.data;

    /* Cancela todos os timeouts anteriores */
    scheduled.forEach(id => clearTimeout(id));
    scheduled.clear();

    alerts.forEach(alert => scheduleOne(alert));

    /* Confirma de volta para a página */
    event.source?.postMessage({ type: 'SCHEDULED_OK', count: alerts.length });
  }

  /* ── Cancelar alerta específico (excluiu uma entrada) ── */
  if (type === 'CANCEL_ALERT') {
    const { keys } = event.data;          // array de alertKeys a cancelar
    keys.forEach(k => {
      if (scheduled.has(k)) {
        clearTimeout(scheduled.get(k));
        scheduled.delete(k);
      }
    });
  }

  /* ── Ping (verificar se SW está vivo) ── */
  if (type === 'PING') {
    event.source?.postMessage({ type: 'PONG', scheduled: scheduled.size });
  }
});

/* ══════════════════════════════════════════════════════
   AGENDA UM ÚNICO ALERTA
══════════════════════════════════════════════════════ */
function scheduleOne(alert) {
  const delay = alert.fireAt - Date.now();

  /* Ignora se já passou ou se está muito longe no futuro (>7 dias) */
  if (delay <= 0)                      return;
  if (delay > 7 * 24 * 60 * 60 * 1000) return;

  const timeoutId = setTimeout(async () => {
    scheduled.delete(alert.key);
    try {
      await self.registration.showNotification(alert.title, {
        body:             alert.body,
        icon:             alert.icon  || '/icon-192.png',
        badge:            alert.badge || '/icon-192.png',
        tag:              alert.key,
        renotify:         true,
        requireInteraction: true,
        vibrate:          [150, 80, 150, 80, 300],
        data: {
          entryId: alert.entryId,
          url:     self.registration.scope,
        },
        actions: [
          { action: 'open',    title: '📋 Abrir FoxAgenda' },
          { action: 'dismiss', title: 'Dispensar'          },
        ],
      });
    } catch (err) {
      console.warn('[FoxAgenda SW] Falha ao mostrar notificação:', err);
    }
  }, delay);

  scheduled.set(alert.key, timeoutId);
}

/* ══════════════════════════════════════════════════════
   CLIQUE NA NOTIFICAÇÃO
══════════════════════════════════════════════════════ */
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || self.registration.scope;
  const entryId   = event.notification.data?.entryId;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        /* Foca na aba já aberta, se existir */
        const existing = clients.find(c => c.url.startsWith(self.registration.scope));
        if (existing) {
          existing.focus();
          if (entryId) existing.postMessage({ type: 'HIGHLIGHT_ENTRY', entryId });
          return;
        }
        /* Abre nova aba */
        return self.clients.openWindow(targetUrl);
      })
  );
});

/* ══════════════════════════════════════════════════════
   FECHAR NOTIFICAÇÃO SEM CLICAR (log apenas)
══════════════════════════════════════════════════════ */
self.addEventListener('notificationclose', () => {
  /* poderia registrar dismissal, mas mantemos simples */
});