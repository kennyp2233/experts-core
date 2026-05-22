(function updateCreationFields() {
  const productoField = document.getElementById('id_producto');
  const fbField = document.getElementById('id_fb_coo');
  const hbField = document.getElementById('id_hb_coo');
  const qbField = document.getElementById('id_qb_coo');
  const ebField = document.getElementById('id_eb_coo');
  const bxsCooField = document.getElementById('id_bxs_coo');
  const pcsCooField = document.getElementById('id_pcs_coo');
  let data = {
    fb_coo: Number(fbField.value),
    hb_coo: Number(hbField.value),
    qb_coo: Number(qbField.value),
    eb_coo: Number(ebField.value),
  };

  function debounce(callback, wait) {
    let timerId;
    return (...args) => {
      clearTimeout(timerId);
      timerId = setTimeout(() => {
        callback(...args);
      }, wait);
    };
  }

  productoField.addEventListener('change', (event) => {
    /**
     * This function listens for a change event on the "productoField"
     * element and updates the "fbField" element's disabled property
     * based on the selected option's "data-is-full-bxs" attribute value.
     * If the value is "True", the "fbField" will be enabled; otherwise,
     * it will be disabled.
     */
    const optionIndex = event.target.selectedIndex;
    const optionElement = event.target.options[optionIndex];
    let isFullBxs = optionElement.attributes['data-is-full-bxs']?.value;
    if (isFullBxs === 'True') {
      fbField.readOnly = false;
      fbField.classList.remove('shadow-none');
      fbField.style.border = null;
      fbField.style.backgroundColor = '';
    } else {
      fbField.classList.add('shadow-none');
      fbField.style.border = 'none';
      fbField.style.opacity = '1';
      fbField.style.backgroundColor = 'var(--bs-secondary-bg)';
      fbField.readOnly = true;
      fbField.value = 0;
    }
  });

  let numericFields = document.querySelectorAll('.modal-body input[type="number"]');

  function updateData(event) {
    data[event.target.name] = Number(event.target.value);
    return data;
  }

  function calculateBox(event) {
    data = updateData(event);
    fetch(BOX_WEIGHT_CALCULATOR_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': CSRFToken,
      },
      body: JSON.stringify(data),
    })
      .then((response) => response.json())
      .then((data) => {
        bxsCooField.value = data.bxs_coo;
        pcsCooField.value = data.pcs_coo;
      });
  }

  numericFields.forEach(function (element) {
    element.addEventListener('change', calculateBox);
    element.addEventListener(
      'keyup',
      debounce((event) => calculateBox(event), DEBOUNCE_DELAY),
    );
  });
})();
