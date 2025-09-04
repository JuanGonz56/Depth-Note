document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM loaded!");
  
  // Let's see what elements actually exist
  console.log("All elements with IDs:", document.querySelectorAll('[id]'));
  
  // Check if our specific element exists
  const toggleBtn = document.getElementById('toggle-tool');
  console.log("toggle-tool element:", toggleBtn);
  
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function() {
      console.log("Button clicked!");
    });
  } else {
    console.log("ERROR: toggle-tool element not found!");
  }
});