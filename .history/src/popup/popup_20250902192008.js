document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM loaded!");
  
  // Let's see the actual ID names
  const elementsWithIds = document.querySelectorAll('[id]');
  elementsWithIds.forEach(function(element) {
    console.log("Found ID:", element.id);
  });
  
  // Try to find any button
  const allButtons = document.querySelectorAll('button');
  console.log("All buttons found:", allButtons.length);
  allButtons.forEach(function(btn, index) {
    console.log(`Button ${index}:`, btn.id, btn.textContent);
  });
});