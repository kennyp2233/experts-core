(function () {
  const inputContainer = document.getElementById('id-detalle-box-input-container');
  const msgContainer = document.getElementById('id-msg-destino');
  const productSelect = document.querySelector("select[name='producto']");
  const formsetCompoundProductContainer = document.getElementById('id-compound-container-formset');
  const submitButton = document.getElementById('id_submit_button');

  if (!productSelect) {
    return;
  }

  const updateCompoundProductFormset = () => {
    const element = productSelect.options[productSelect.selectedIndex];
    if (element.dataset.isCompoundProduct === 'True') {
      formsetCompoundProductContainer.style.display = 'block';
    } else {
      formsetCompoundProductContainer.style.display = 'none';
    }
  };

  const updateCompoundProductDescription = () => {
    const element = productSelect.options[productSelect.selectedIndex];
    const errorMessage = element.dataset.errorMessage || '';

    if (errorMessage) {
      inputContainer.style.display = 'none';
      msgContainer.style.display = 'block';
      msgContainer.innerHTML = `<i class='bi bi-exclamation-circle me-1'></i> ${errorMessage}`;
      formsetCompoundProductContainer.style.display = 'none';
      if (submitButton) {
        submitButton.disabled = true;
      }
    } else {
      updateCompoundProductFormset();
      inputContainer.style.display = 'block';
      msgContainer.style.display = 'none';
      msgContainer.innerHTML = '';
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  };

  productSelect.addEventListener('change', () => {
    updateCompoundProductDescription();
  });

  updateCompoundProductDescription();
})();
