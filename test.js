try {
  "1000".toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
} catch (e) {
  console.log("Error:", e.message);
}
