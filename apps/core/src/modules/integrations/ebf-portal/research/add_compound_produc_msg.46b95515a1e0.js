(function () {
  const compountContainer = document.getElementById('id-compound-container');
  const productSelect = document.querySelector("select[name='producto']");

  const updateCompoundProductDescription = () => {
    // Check if there are no products available
    if (!productSelect || productSelect.options.length === 0 || productSelect.selectedIndex < 0) {
      compountContainer.innerHTML = '';
      compountContainer.style.display = 'none';
      return;
    }

    const element = productSelect.options[productSelect.selectedIndex];
    if (element.dataset.isCompoundProduct === 'True') {
      compountContainer.innerHTML =
        "<i class='bi bi-inboxes-fill text-warning'></i> Este es un producto compuesto. Por lo que cada caja debe contener más de una variedad. ";
      compountContainer.style.display = 'block';
    } else {
      compountContainer.innerHTML = '';
      compountContainer.style.display = 'none';
    }
  };

  productSelect.addEventListener('change', (event) => {
    updateCompoundProductDescription();
  });
  updateCompoundProductDescription();
})();
