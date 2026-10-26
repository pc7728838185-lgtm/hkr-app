/* ═══════════════════════════════════════════
   HKR TOURNAMENTS — SERVICE WORKER
   Real Push Notifications Support
   ═══════════════════════════════════════════ */

const CACHE_NAME = 'hkr-v1';

/* ═══ INSTALL ═══ */
self.addEventListener('install', (event) => {
  console.log('SW: Installed');
  self.skipWaiting();
});

/* ═══ ACTIVATE ═══ */
self.addEventListener('activate', (event) => {
  console.log('SW: Activated');
  event.waitUntil(clients.claim());
});

/* ═══ PUSH EVENT ═══ */
self.addEventListener('push', (event) => {

  console.log('SW: Push received');

  let data = {
    title: 'HKR Tournaments',
    body: 'New notification',
    icon: 'assets/hkr-logo.png',
    badge: 'assets/hkr-logo.png',
    url: '/'
  };

  try{
    if(event.data){
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  }catch(e){
    if(event.data){
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || 'assets/hkr-logo.png',
    badge: data.badge || 'assets/hkr-logo.png',
    vibrate: [300, 100, 300, 100, 300],
    tag: data.tag || 'hkr-' + Date.now(),
    requireInteraction: true,
    renotify: true,
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'close', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );

});

/* ═══ NOTIFICATION CLICK ═══ */
self.addEventListener('notificationclick', (event) => {
  
  event.notification.close();

  if(event.action === 'close'){
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for(let client of windowClients){
          if(client.url.includes(self.location.origin)){
            client.focus();
            client.postMessage({ type: 'NOTIF_CLICK', url: urlToOpen });
            return;
          }
        }
        if(clients.openWindow){
          return clients.openWindow(urlToOpen);
        }
      })
  );

});

/* ═══ MESSAGE FROM MAIN THREAD ═══ */
self.addEventListener('message', (event) => {
  if(event.data && event.data.type === 'SKIP_WAITING'){
    self.skipWaiting();
  }
});