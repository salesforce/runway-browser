function hideDetails() {
  console.log('test')
  var element = document.getElementById("tabs");
  
  if(element.style.visibility == 'hidden'){
    element.style.visibility = 'visible';

  }
  else
  {
    element.style.visibility = 'hidden';
  }
}