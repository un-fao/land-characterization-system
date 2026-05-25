document.addEventListener('DOMContentLoaded', () => {
  const current = location.pathname.split('/').pop() || "index.html";
  document.querySelectorAll('.sidebar a').forEach(a => {
    if (a.getAttribute('href').endsWith(current)) a.classList.add('active');
  });

  const box = document.getElementById('search-box');
  const panel = document.getElementById('search-results');
  if (!box) return;

  // Automatically adjust path based on page depth
  const depth = location.pathname.includes('/sections/') ? '../' : '';
  const searchIndexPath = `${depth}assets/js/search_index.json`;

  async function searchDocs(query) {
    if (query.length < 2) {
      panel.classList.remove('active');
      return;
    }
    try {
      const data = await fetch(searchIndexPath).then(r => r.json());
      const results = data.filter(it =>
        (it.title + it.content).toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10);

      panel.innerHTML = '';
      if (!results.length) {
        panel.classList.remove('active');
        return;
      }

      for (const it of results) {
        const div = document.createElement('div');
        div.className = 'item';
        div.innerHTML = `
          <div class="title">${it.title}</div>
          <div class="snippet">${it.content.substring(0, 140)}...</div>`;
        div.onclick = () => {
          window.location.href = depth + it.href;
        };
        panel.appendChild(div);
      }
      panel.classList.add('active');
    } catch (err) {
      console.error("Search index load failed:", err);
    }
  }

  box.addEventListener('input', e => searchDocs(e.target.value.trim()));
  document.addEventListener('click', e => {
    if (!panel.contains(e.target) && e.target !== box) panel.classList.remove('active');
  });
});
