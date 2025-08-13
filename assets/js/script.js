document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const burger = document.getElementById('burger');
  const backdrop = document.getElementById('backdrop');
  const content = document.getElementById('content');
  const groups = document.querySelectorAll('.nav-group');

  // Mobile push sidebar
  const openMobile = () => body.classList.add('mobile-open');
  const closeMobile = () => body.classList.remove('mobile-open');
  const isMobile = () => window.matchMedia('(max-width: 991.98px)').matches;

  if (burger) burger.addEventListener('click', () => {
    body.classList.toggle('mobile-open');
  });
  if (backdrop) backdrop.addEventListener('click', closeMobile);
  window.addEventListener('resize', () => { if (!isMobile()) closeMobile(); });

  // Expand/collapse groups + remember state
  const storageKeyGroup = 'lgu_open_groups';
  const openGroups = new Set(JSON.parse(localStorage.getItem(storageKeyGroup) || '[]'));
  groups.forEach((g, idx) => {
    const btn = g.querySelector('.group-toggle');
    const key = `g${idx}`;
    if (openGroups.has(key)) g.classList.add('open');
    btn.addEventListener('click', () => {
      g.classList.toggle('open');
      if (g.classList.contains('open')) openGroups.add(key); else openGroups.delete(key);
      localStorage.setItem(storageKeyGroup, JSON.stringify([...openGroups]));
    });
  });

  // AJAX load submodules
  const links = document.querySelectorAll('.sublist a');
  const storageKeyActive = 'lgu_active_href';

  function setActive(link) {
    document.querySelectorAll('.sublist a.active').forEach(a => a.classList.remove('active'));
    link.classList.add('active');
    const group = link.closest('.nav-group');
    if (group && !group.classList.contains('open')) group.classList.add('open');
  }

  async function loadLink(link, pushState = true) {
    const href = link.getAttribute('data-href');
    if (!href) return;

    setActive(link);

    content.innerHTML = `
      <div class="cardish">
        <div class="d-flex align-items-center gap-2">
          <div class="spinner-border spinner-border-sm text-danger" role="status"></div>
          <strong>Loading ${link.textContent.trim()}...</strong>
        </div>
      </div>
    `;

    try {
      const resp = await fetch(href, { cache: 'no-store' });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const html = await resp.text();
      content.innerHTML = html;
      localStorage.setItem(storageKeyActive, href);

      // Update URL
      if (pushState) {
        const u = new URL(window.location.href);
        u.searchParams.set('src', href);
        history.pushState({ src: href }, '', u.toString());
      }


    } catch (e) {
      content.innerHTML = `
        <div class="cardish">
          <h3 class="mb-2">Failed to load</h3>
          <p class="text-muted">Could not load: <code>${href}</code> (${e.message}).</p>
        </div>
      `;
      console.error(e);
    }
  }

  links.forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      loadLink(a);
    });
    a.setAttribute('tabindex','0');
    a.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); a.click(); }});
  });

  // Restore last visited or from URL ?src=
  const param = new URLSearchParams(window.location.search).get('src');
  const last = param || localStorage.getItem(storageKeyActive);
  if (last) {
    const found = Array.from(links).find(a => a.getAttribute('data-href') === last);
    if (found) loadLink(found, false);
  }

  // Popstate for back/forward
  window.addEventListener('popstate', (ev) => {
    const src = (ev.state && ev.state.src) || new URLSearchParams(window.location.search).get('src');
    if (!src) return;
    const found = Array.from(links).find(a => a.getAttribute('data-href') === src);
    if (found) loadLink(found, false);
  });
});
