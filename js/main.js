/* main.js: starts the app, wires the bottom tab bar and registers the offline service worker. */
(function (A) {
  "use strict";
  var h = A.h;
  var routes = { home: function () { A.home(); }, learn: function () { A.learnMenu(); }, subnet: function () { A.subnetMenu(); }, cards: function () { A.cardsMenu(); }, quiz: function () { A.quizMenu(); }, more: function () { A.moreMenu(); } };
  document.getElementById("tabs").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-tab]");
    if (b && A.D) routes[b.dataset.tab]();
  });

  function start() {
    A.loadState();
    Promise.all([A.loadData(), A.connectCloud()]).then(function () { A.home(); }, function () {
      A.frame({ title: "CCNA 200-301 v2.0" }, [
        h("div", { class: "notice", text: "The practice content could not be loaded. If this is your first visit you need a connection once; after that the app works offline." }),
        h("button", { class: "btn", type: "button", text: "Try again", onclick: start })]);
    });
  }
  start();

  /* Offline support. The service worker keeps a full copy of the app on the phone. */
  if ("serviceWorker" in navigator && !A.hosted) {
    var hadController = !!navigator.serviceWorker.controller;
    /* A phone keeps a home-screen app alive for days, so also look for a new version every time the app comes back to the front. */
    var check = function () { navigator.serviceWorker.getRegistration().then(function (reg) { if (reg) reg.update(); }).catch(function () { /* offline */ }); };
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").then(check, function () { /* offline support unavailable: the app still works online */ }); });
    document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") check(); });
    /* The new version is ready. On a menu, load it straight away. In the middle of a quiz or a card session, wait and say so. */
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (!hadController) { hadController = true; return; }
      if (document.body.classList.contains("focus")) A.toast("App updated. Close and reopen it to get the new version."); else location.reload();
    });
  }
})(window.CCNA);
