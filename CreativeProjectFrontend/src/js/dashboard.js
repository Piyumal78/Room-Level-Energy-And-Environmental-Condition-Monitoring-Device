document.addEventListener('DOMContentLoaded', () => {
    // Toggle Year Dropdown
    const yearMenuButton = document.getElementById('year-menu-button');
    const yearDropdown = document.getElementById('year-dropdown');
  
    yearMenuButton?.addEventListener('click', () => {
      yearDropdown.classList.toggle('hidden');
    });
  
    // Toggle Month Dropdown
    const monthMenuButton = document.getElementById('month-menu-button');
    const monthDropdown = document.getElementById('month-dropdown');
  
    monthMenuButton?.addEventListener('click', () => {
      monthDropdown.classList.toggle('hidden');
    });
  });
  