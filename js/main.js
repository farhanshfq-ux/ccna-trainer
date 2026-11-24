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
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () { /* offline support unavailable: the app still works online */ }); });
    navigator.serviceWorker.addEventListener("controllerchange", function () { if (hadController) A.toast("App updated. Close and reopen it to get the new version."); hadController = true; });
  }
})(window.CCNA);
