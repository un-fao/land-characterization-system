
document.addEventListener('DOMContentLoaded', () => {
  const main = document.querySelector('main');
  if(!main) return;
  const headings = main.querySelectorAll('h2, h3, h4');
  const toc = document.createElement('aside');
  toc.className = 'toc-panel';
  toc.innerHTML = '<h3>📑 Table of Contents</h3>';
  const list = document.createElement('ul');
  headings.forEach(h => {
    const id = h.id || h.textContent.trim().toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9\-]/g,'');
    h.id = id;
    const li = document.createElement('li');
    li.innerHTML = `<a href="#${id}">${h.textContent}</a>`;
    list.appendChild(li);
  });
  toc.appendChild(list);
  document.body.appendChild(toc);
});
