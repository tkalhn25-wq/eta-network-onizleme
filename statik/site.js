// E.T.A. Network sitesi: menü, keşif ve arıza formları. Sunucu yok: form, ziyaretçinin seçtiği kanalla
// (WhatsApp / e-posta) gönderilir. Keşif mesajının son satırı ETA-Teklif uygulamasına yapıştırılabilen JSON'dur.
(() => {
  "use strict";
  const $ = (s, k = document) => k.querySelector(s);
  const $$ = (s, k = document) => [...k.querySelectorAll(s)];
  let firma = { telefon: "+905462496535", eposta: "e.t.a@etanetwork.org" };
  fetch(new URL("firma.json", document.currentScript.src))   // alt yolda (önizleme) da çalışsın.then((r) => r.ok && r.json()).then((j) => j && (firma = j)).catch(() => {});

  // menü
  const md = $(".menu-dugme"), menu = $("#menu");
  if (md) md.addEventListener("click", () => {
    const acik = menu.classList.toggle("acik");
    md.setAttribute("aria-expanded", String(acik));
  });

  const waAdres = (metin) => `https://wa.me/${firma.telefon.replace(/\D/g, "")}?text=${encodeURIComponent(metin)}`;
  const tarih = () => new Date().toLocaleDateString("tr-TR");

  function hataGoster(form, alanlar) {
    $$("[aria-invalid]", form).forEach((x) => x.removeAttribute("aria-invalid"));
    alanlar.forEach((x) => x.setAttribute("aria-invalid", "true"));
    const kutu = $(".form-hata", form);
    if (kutu) { kutu.hidden = !alanlar.length; kutu.textContent = alanlar.length ? "Lütfen işaretli alanları doldurun." : ""; }
    if (alanlar.length) alanlar[0].focus();
    return alanlar.length === 0;
  }
  const eksikler = (form) => $$("[required]", form).filter((x) => (x.type === "checkbox" ? !x.checked : !x.value.trim()));

  // keşif formu
  const kesif = $("[data-kesif]");
  if (kesif) {
    const sistemDegisti = (fs) => fs.classList.toggle("acik", $("input[name=sistem]", fs).checked);
    $$(".sistem", kesif).forEach((fs) => {
      $("input[name=sistem]", fs).addEventListener("change", () => sistemDegisti(fs));
    });
    const on = new URLSearchParams(location.search).get("sistem");
    if (on) { const k = $(`.sistem[data-sistem="${CSS.escape(on)}"] input[name=sistem]`, kesif); if (k) { k.checked = true; sistemDegisti(k.closest(".sistem")); } }

    // adım göstergesi: görünür alana göre
    const adimlar = $$(".adimlar li", kesif), alanlar = $$(":scope > fieldset", kesif);
    if ("IntersectionObserver" in window) {
      const g = new IntersectionObserver((ler) => ler.forEach((x) => {
        if (x.isIntersecting) adimlar.forEach((a, i) => a.classList.toggle("etkin", i <= alanlar.indexOf(x.target)));
      }), { rootMargin: "-40% 0px -50% 0px" });
      alanlar.forEach((f) => g.observe(f));
    }

    kesif.addEventListener("submit", (ev) => {
      ev.preventDefault();
      if (!hataGoster(kesif, eksikler(kesif))) return;
      const v = (ad) => (kesif.elements[ad]?.value || "").trim();
      const secili = $$("input[name=sistem]:checked", kesif).map((x) => x.value);
      const sistemler = {};
      secili.forEach((s) => {
        const g = {};
        $$(`[name^="s.${s}."]`, kesif).forEach((x) => { if (x.value !== "") g[x.name.split(".")[2]] = Number(x.value); });
        sistemler[s] = g;
      });
      const no = "K-" + new Date().toISOString().slice(2, 10).replace(/-/g, "") + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
      const binaAd = kesif.elements.bina_tipi.selectedOptions[0].textContent;
      const kesifVerisi = {
        tur: "eta-kesif", surum: 1, no, tarih: new Date().toISOString(),
        musteri: v("kurum") || v("ad"), proje_adi: [binaAd, v("konum")].filter(Boolean).join(" · "),
        bina_tipi: v("bina_tipi"), sistemler,
        iletisim: { ad: v("ad"), kurum: v("kurum"), telefon: v("telefon"), eposta: v("eposta") },
        bina: { konum: v("konum"), kat: v("kat"), alan_m2: v("alan_m2"), durum: v("durum") }, not: v("not"),
      };
      const adlar = Object.fromEntries($$(".sistem", kesif).map((fs) => [fs.dataset.sistem, $(".secim span", fs).textContent]));
      const etiket = (fs, alan) => $(`[name="s.${fs}.${alan}"]`, kesif)?.closest("label")?.firstChild?.textContent?.trim() || alan;
      const ops = (ad, on, son = "") => (v(ad) ? on + v(ad) + son : null);   // boş alan satırı hiç yazılmaz
      const satirlar = [
        `KEŞİF TALEBİ ${no} (${tarih()})`, "",
        `Ad: ${v("ad")}`, ops("kurum", "Kurum: "), `Telefon: ${v("telefon")}`, ops("eposta", "E-posta: "), "",
        `Bina: ${binaAd}${v("konum") ? " · " + v("konum") : ""}`, ops("kat", "Kat: "), ops("alan_m2", "Alan: ", " m²"), `Durum: ${v("durum")}`, "",
        secili.length ? "Sistemler:" : "Sistem seçilmedi.",
        ...secili.map((s) => `• ${adlar[s]}: ` + (Object.entries(sistemler[s]).map(([k, x]) => `${etiket(s, k)} ${x}`).join(", ") || "adet belirtilmedi")),
        ops("not", "\nNot: "),
      ].filter((x) => x !== null);
      const insan = satirlar.join("\n");
      const tam = `${insan}\n\n#ETA-KESIF ${JSON.stringify(kesifVerisi)}`;

      const sonuc = $(".kesif-sonuc");
      $(".sonuc-ozet", sonuc).textContent = insan;
      $("[data-gonder=wa]", sonuc).href = waAdres(tam);
      $("[data-gonder=eposta]", sonuc).href = `mailto:${firma.eposta}?subject=${encodeURIComponent("Keşif talebi " + no)}&body=${encodeURIComponent(tam)}`;
      sonuc.hidden = false;
      sonuc.scrollIntoView({ behavior: "smooth", block: "start" });
      sonuc.focus({ preventScroll: true });
    });
  }

  // arıza formu
  const ariza = $("[data-ariza]");
  if (ariza) ariza.addEventListener("submit", (ev) => {
    ev.preventDefault();
    if (!hataGoster(ariza, eksikler(ariza))) return;
    const f = ariza.elements;
    const metin = `ARIZA BİLDİRİMİ (${tarih()})\nKurum: ${f.kurum.value.trim()}\nTelefon: ${f.telefon.value.trim()}\nSistem: ${f.sistem.value}\n\n${f.aciklama.value.trim()}`;
    window.open(waAdres(metin), "_blank", "noopener");
  });
})();
