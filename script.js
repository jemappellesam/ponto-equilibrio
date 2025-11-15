// script.js
// Form logic: 5 products; calculations; formatting pt-BR currency.

const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function $(sel){ return document.querySelector(sel) }
function $all(sel){ return Array.from(document.querySelectorAll(sel)) }

document.addEventListener('DOMContentLoaded', () => {
  const template = document.getElementById('product-row-template').content;
  const form = document.getElementById('products-form');

  // create 5 product rows
  for (let i=0;i<5;i++){
    const clone = template.cloneNode(true);
    const row = clone.querySelector('.product-row');

    // set placeholder names
    const nameInput = row.querySelector('.prod-name');
    nameInput.value = `Produto ${i+1}`;
    form.appendChild(row);
  }

  // elements
  const fixedInput = $('#fixed-costs');
  const calcBtn = $('#calculate');
  const loadExampleBtn = $('#load-example');
  const resetBtn = $('#reset');
  const exportBtn = $('#export-csv');

  calcBtn.addEventListener('click', calculateAll);
  loadExampleBtn.addEventListener('click', loadExample);
  resetBtn.addEventListener('click', resetAll);
  exportBtn.addEventListener('click', exportCSV);

  // calculate when inputs change
  form.addEventListener('input', debounce(calculateAll, 300));

  // initial populate with zeros
  calculateAll();
});

// debounce helper
function debounce(fn, wait=200){
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(()=>fn(...args), wait);
  }
}

function readProducts(){
  const rows = $all('.product-row');
  return rows.map(r => {
    const name = r.querySelector('.prod-name').value || '';
    const cvu = parseFloat(r.querySelector('.cvu').value || 0) || 0;
    const price = parseFloat(r.querySelector('.price').value || 0) || 0;
    const qty = parseInt(r.querySelector('.qty').value || 0) || 0;
    return { name, cvu, price, qty };
  });
}

function calculateAll(){
  const products = readProducts();
  const fixed = parseFloat($('#fixed-costs').value || 0) || 0;

  // per-product calculations
  products.forEach(p => {
    p.revenue = round2(p.price * p.qty);
    p.varCost = round2(p.cvu * p.qty);
    p.margin = round2((p.price - p.cvu) * p.qty);
  });

  const totalRevenue = round2(products.reduce((s,p)=>s+p.revenue,0));
  const totalVarCost = round2(products.reduce((s,p)=>s+p.varCost,0));
  const totalMargin = round2(products.reduce((s,p)=>s+p.margin,0));

  const marginPercent = totalRevenue === 0 ? 0 : round2((totalMargin / totalRevenue) * 100);
  const varCostPercent = totalRevenue === 0 ? 0 : (totalVarCost / totalRevenue);

  // Break-even revenue: fixed / (marginPercent / 100)
  let breakEvenRevenue = 0;
  if (marginPercent <= 0) {
    breakEvenRevenue = NaN; // signal impossible / no margin
  } else {
    breakEvenRevenue = round2( fixed / (marginPercent / 100) );
  }

  // DRE at break-even
  const dreRevenue = isNaN(breakEvenRevenue) ? 0 : breakEvenRevenue;
  const dreVar = isNaN(breakEvenRevenue) ? 0 : round2(dreRevenue * varCostPercent);
  const dreMargin = round2(dreRevenue - dreVar);
  const dreFixed = round2(fixed);
  const dreResult = round2(dreMargin - dreFixed);

  // render summary
  $('#total-revenue').textContent = formatter.format(totalRevenue);
  $('#total-variable').textContent = formatter.format(totalVarCost);
  $('#total-margin').textContent = formatter.format(totalMargin);
  $('#margin-percent').textContent = `${marginPercent.toFixed(2)} %`;
  $('#break-even-revenue').textContent = isNaN(breakEvenRevenue) ? '— Margem <= 0' : formatter.format(breakEvenRevenue);

  // render table
  renderProductsTable(products);

  // render DRE
  $('#dre-revenue').textContent = isNaN(breakEvenRevenue) ? '—' : formatter.format(dreRevenue);
  $('#dre-variable').textContent = isNaN(breakEvenRevenue) ? '—' : formatter.format(dreVar);
  $('#dre-margin').textContent = isNaN(breakEvenRevenue) ? '—' : formatter.format(dreMargin);
  $('#dre-fixed').textContent = formatter.format(dreFixed);
  $('#dre-result').textContent = isNaN(breakEvenRevenue) ? '—' : formatter.format(dreResult);
}

function renderProductsTable(products){
  const tbody = $('#products-table tbody');
  tbody.innerHTML = '';
  products.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(p.name)}</td>
      <td>${p.qty.toLocaleString('pt-BR')}</td>
      <td>${formatter.format(p.price)}</td>
      <td>${formatter.format(p.revenue)}</td>
      <td>${formatter.format(p.cvu)}</td>
      <td>${formatter.format(p.varCost)}</td>
      <td>${formatter.format(p.margin)}</td>
    `;
    tbody.appendChild(tr);
  });

  // add totals row
  const totals = products.reduce((acc,p)=>{
    acc.qty += p.qty;
    acc.revenue += p.revenue;
    acc.varCost += p.varCost;
    acc.margin += p.margin;
    return acc;
  }, {qty:0,revenue:0,varCost:0,margin:0});

  const tr = document.createElement('tr');
  tr.style.fontWeight='700';
  tr.innerHTML = `
    <td>Total mix</td>
    <td>${totals.qty.toLocaleString('pt-BR')}</td>
    <td></td>
    <td>${formatter.format(round2(totals.revenue))}</td>
    <td></td>
    <td>${formatter.format(round2(totals.varCost))}</td>
    <td>${formatter.format(round2(totals.margin))}</td>
  `;
  tbody.appendChild(tr);
}

function loadExample(){
  // Example from the provided document (lampadas e bocais)
  const rows = $all('.product-row');
  const example = [
    { name: 'Lâmpada 40', cvu: 1.50, price: 2.50, qty: 12000 },
    { name: 'Lâmpada 60', cvu: 3.30, price: 5.00, qty: 5000 },
    { name: 'Lâmpada 80', cvu: 5.00, price: 7.00, qty: 6000 },
    { name: 'Bocal A', cvu: 1.80, price: 1.60, qty: 10000 },
    { name: 'Bocal B', cvu: 1.20, price: 1.00, qty: 6000 }
  ];
  rows.forEach((r,i)=>{
    r.querySelector('.prod-name').value = example[i].name;
    r.querySelector('.cvu').value = example[i].cvu.toFixed(2);
    r.querySelector('.price').value = example[i].price.toFixed(2);
    r.querySelector('.qty').value = example[i].qty;
  });
  $('#fixed-costs').value = '20000.00';
  calculateAll();
}

function resetAll(){
  $all('.product-row').forEach((r,i)=>{
    r.querySelector('.prod-name').value = `Produto ${i+1}`;
    r.querySelector('.cvu').value = '';
    r.querySelector('.price').value = '';
    r.querySelector('.qty').value = '';
  });
  $('#fixed-costs').value = '';
  calculateAll();
}

function exportCSV(){
  const products = readProducts();
  const fixed = parseFloat($('#fixed-costs').value || 0) || 0;

  let csv = 'Produto;Qtde;Preco_unit;Custo_var_unit;Receita;Custo_var_total;Margem\\n';
  products.forEach(p=>{
    const revenue = round2(p.price * p.qty);
    const varCost = round2(p.cvu * p.qty);
    const margin = round2((p.price - p.cvu) * p.qty);
    csv += `${p.name};${p.qty};${p.price.toFixed(2)};${p.cvu.toFixed(2)};${revenue.toFixed(2)};${varCost.toFixed(2)};${margin.toFixed(2)}\\n`;
  });
  csv += `CUSTO_FIXO;;${fixed.toFixed(2)};;;;\\n`;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ponto_equilibrio.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// helpers
function round2(v){ return Math.round((v + Number.EPSILON) * 100) / 100; }

function escapeHtml(s){
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
