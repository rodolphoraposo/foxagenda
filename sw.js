/* ═══════════════════════════════════════════════════════════
   FoxAgenda — sw.js  (Service Worker)

   RESPONSABILIDADE DESTE ARQUIVO:
   • Exibir notificações nativas quando a PÁGINA PRINCIPAL manda
   • Tratar cliques nas notificações (focar a aba ou abrir nova)

   O QUE NÃO ESTÁ MAIS AQUI:
   • Agendamento com setTimeout — SWs são terminados pelo browser
     quando ociosos; qualquer setTimeout definido aqui é perdido.
     A lógica de tempo ficou inteiramente em script.js.
   ═══════════════════════════════════════════════════════════ */

'use strict';

self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', e  => e.waitUntil(self.clients.claim()));

self.addEventListener('message', event => {
  const msg = event.data;
  if (!msg) return;

  if (msg.type === 'SHOW_NOTIFICATION') {
    event.waitUntil(
      self.registration.showNotification(msg.title, {
        body:               msg.body,
        icon:               msg.icon  || '/favicon.ico',
        badge:              msg.icon  || '/favicon.ico',
        tag:                msg.tag   || 'foxagenda-alert',
        renotify:           true,
        requireInteraction: true,
        vibrate:            [150, 80, 150, 80, 300],
        data: { entryId: msg.entryId, url: self.registration.scope },
        actions: [
          { action: 'open',    title: '📋 Abrir FoxAgenda' },
          { action: 'dismiss', title: 'Dispensar' },
        ],
      }).catch(err => console.warn('[SW] showNotification falhou:', err))
    );
  }

  if (msg.type === 'PING') {
    event.source?.postMessage({ type: 'PONG' });
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || self.registration.scope;
  const entryId   = event.notification.data?.entryId;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        const existing = clients.find(c => c.url.startsWith(self.registration.scope));
        if (existing) {
          existing.focus();
          if (entryId) existing.postMessage({ type: 'HIGHLIGHT_ENTRY', entryId });
          return;
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});