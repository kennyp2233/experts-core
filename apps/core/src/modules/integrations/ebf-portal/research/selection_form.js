(function selectionForm() {
  const formEl = document.getElementById('multiple-detalle-form');
  const createButton = document.getElementById('id-create-button');
  const reloadButton = document.getElementById('id-refresh-btn');
  const detalleVueloSection = document.getElementById('id_detalle_vuelo');

  const createURL = (url) => new URL(url, baseUrl);

  // --------- NEW: busy lock ----------
  let pending = 0;

  const setBusy = (busy) => {
    // disable during async updates
    createButton.disabled = busy || !isReady();
    reloadButton.disabled = busy;
    formEl.querySelectorAll('select').forEach((s) => (s.disabled = busy));
  };

  const begin = () => {
    pending += 1;
    setBusy(true);
  };

  const end = () => {
    pending = Math.max(0, pending - 1);
    setBusy(pending > 0);
  };

  // Prevent the HTMX click on Coordinar while busy (this is the big one)
  createButton.addEventListener('click', (e) => {
    if (pending > 0) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  const isReady = () => {
    const exportador = formEl.querySelector('#id_exportador')?.value || '';
    const consignatario = formEl.querySelector('#id_consignatario_marcacion')?.value || '';
    const vuelo = formEl.querySelector('#id_vuelo')?.value || '';
    const dae = formEl.querySelector('#id_dae')?.value || '';
    return !!(exportador && consignatario && vuelo && dae);
  };

  const setCreateEnabled = () => setBusy(pending > 0);

  // ---------- OPTIONAL BUT STRONGLY RECOMMENDED: ignore stale responses ----------
  let seq = 0; // increments when user changes a parent field

  const safeAjax = async (method, url, target, runSeq) => {
    begin();
    try {
      await htmx.ajax(method, url, target);
      // if user changed again while request was running, ignore follow-up actions
      return runSeq === seq;
    } finally {
      end();
    }
  };

  const fetchDetails = async (runSeq) => {
    if (!isReady()) {
      setCreateEnabled();
      return;
    }
    const exportador = formEl.querySelector('#id_exportador').value;
    const consignatario = formEl.querySelector('#id_consignatario_marcacion').value;
    const vuelo = formEl.querySelector('#id_vuelo').value;
    const dae = formEl.querySelector('#id_dae').value;

    const url = createURL(DETALLE_VUELO_URL);
    url.searchParams.set('vuelo', vuelo);
    url.searchParams.set('consignatario_marcacion', consignatario);
    url.searchParams.set('exportador', exportador);
    url.searchParams.set('dae', dae);

    await safeAjax('GET', url.href, detalleVueloSection, runSeq);
  };

  // Event delegation so it survives swaps
  formEl.addEventListener('change', async (event) => {
    const id = event.target.id;

    if (id === 'id_exportador') {
      seq += 1;
      const runSeq = seq;

      const url = createURL(CONSIGNATARIO_URL);
      url.searchParams.set('exportador', event.target.value);

      const ok = await safeAjax('GET', url.href, '#id_consignatario_marcacion', runSeq);
      if (!ok) return;
      formEl.querySelector('#id_consignatario_marcacion')?.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (id === 'id_consignatario_marcacion') {
      seq += 1;
      const runSeq = seq;

      const exportador = formEl.querySelector('#id_exportador')?.value || '';
      const url = createURL(VUELO_URL);
      url.searchParams.set('exportador', exportador);
      url.searchParams.set('consignatario_marcacion', event.target.value);

      const ok = await safeAjax('GET', url.href, '#id_vuelo', runSeq);
      if (!ok) return;
      formEl.querySelector('#id_vuelo')?.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (id === 'id_vuelo') {
      seq += 1;
      const runSeq = seq;

      const exportador = formEl.querySelector('#id_exportador')?.value || '';
      const consignatario = formEl.querySelector('#id_consignatario_marcacion')?.value || '';
      const url = createURL(DAE_URL);
      url.searchParams.set('doc_coordinacion', event.target.value);
      url.searchParams.set('consignatario_marcacion', consignatario);
      url.searchParams.set('exportador', exportador);

      const ok = await safeAjax('GET', url.href, '#id_dae', runSeq);
      if (!ok) return;
      formEl.querySelector('#id_dae')?.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (id === 'id_dae') {
      // do not increment seq here unless you want DAE changes to cancel detail loads
      const runSeq = seq;
      await fetchDetails(runSeq);
    }

    setCreateEnabled();
  });

  reloadButton.addEventListener('click', async (e) => {
    e.preventDefault();
    await fetchDetails(seq);
    setCreateEnabled();
  });

  document.addEventListener('DOMContentLoaded', () => {
    setCreateEnabled();
    formEl.querySelector('#id_exportador')?.dispatchEvent(new Event('change', { bubbles: true }));
  });
})();
