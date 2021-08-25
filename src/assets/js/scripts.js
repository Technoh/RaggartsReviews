window.onload = function() {
  const username = 'reviewer';
  const domainName = 'raggartsreviews.com';
  document.getElementById('email_placeholder').innerHTML = `<a href="mailto:${username}@${domainName}">Get in touch!</a>`;
}