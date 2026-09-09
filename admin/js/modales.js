/* =========================================================
   modales.js
   Abrir/cerrar modales (nuevo y edición), llenar selects,
   guardar/editar/eliminar ventas, compras, proveedores y
   productos — con ajuste automático de stock en cada caso.
   ========================================================= */

function cerrarModal(idModal) {
  document.getElementById(idModal).classList.remove('show');
  const form = document.querySelector(`#${idModal} form`);
  if (form) form.reset();
  const idOculto = form?.querySelector('input[type="hidden"]');
  if (idOculto) idOculto.value = '';
}

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    cerrarModal(e.target.id);
  }
});

// -----------------------------------------------------------
// Selects dinámicos
// -----------------------------------------------------------
async function cargarProductosEnSelect(idSelect, mostrarStock, idSeleccionado = null) {
  const { data: productos } = await supabaseClient
    .from('productos')
    .select('id, nombre, precio, stock_actual')
    .order('nombre');

  const select = document.getElementById(idSelect);
  select.innerHTML = '<option value="">Seleccionar reloj...</option>';

  (productos || []).forEach((p) => {
    const opcion = document.createElement('option');
    opcion.value = p.id;
    opcion.dataset.precio = p.precio;
    opcion.dataset.stock = p.stock_actual ?? 0;
    opcion.textContent = mostrarStock
      ? `${p.nombre} — Bs ${p.precio} (stock: ${p.stock_actual ?? 0})`
      : `${p.nombre} — Bs ${p.precio}`;
    if (idSeleccionado && p.id === idSeleccionado) opcion.selected = true;
    select.appendChild(opcion);
  });
}

async function cargarProveedoresEnSelect(idSelect, idSeleccionado = null) {
  const { data: proveedores } = await supabaseClient
    .from('proveedores')
    .select('id, nombre')
    .eq('estado', 'activo')
    .order('nombre');

  const select = document.getElementById(idSelect);
  select.innerHTML = '<option value="">Seleccionar proveedor...</option>';

  (proveedores || []).forEach((p) => {
    const opcion = document.createElement('option');
    opcion.value = p.id;
    opcion.textContent = p.nombre;
    if (idSeleccionado && p.id === idSeleccionado) opcion.selected = true;
    select.appendChild(opcion);
  });

  if (!proveedores || proveedores.length === 0) {
    select.innerHTML = '<option value="">No hay proveedores. Cargá uno primero.</option>';
  }
}

document.addEventListener('change', (e) => {
  if (e.target.id === 'venta-producto') {
    const opcion = e.target.selectedOptions[0];
    if (opcion && opcion.dataset.precio) {
      document.getElementById('venta-precio').value = opcion.dataset.precio;
    }
  }
});

/* =========================================================
   PRODUCTO (solo edición — los relojes nuevos se cargan
   directo en Supabase; acá se corrigen datos y stock mínimo)
   ========================================================= */
async function abrirModalEditarProducto(id) {
  const { data: p } = await supabaseClient.from('productos').select('*').eq('id', id).single();
  if (!p) return;

  document.getElementById('producto-id').value = p.id;
  document.getElementById('producto-nombre').value = p.nombre || '';
  document.getElementById('producto-categoria').value = p.categoria || 'unisex';
  document.getElementById('producto-precio').value = p.precio || 0;
  document.getElementById('producto-estilo').value = p.estilo || '';
  document.getElementById('producto-tipo-correa').value = p.tipo_correa || '';
  document.getElementById('producto-color-correa').value = p.color_correa || '';
  document.getElementById('producto-diseno-esfera').value = p.diseno_esfera || '';
  document.getElementById('producto-stock-minimo').value = p.stock_minimo ?? 3;

  document.getElementById('modal-producto').classList.add('show');
}

document.getElementById('form-producto').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('producto-id').value;

  const { error } = await supabaseClient.from('productos').update({
    nombre: document.getElementById('producto-nombre').value.trim(),
    categoria: document.getElementById('producto-categoria').value,
    precio: parseFloat(document.getElementById('producto-precio').value),
    estilo: document.getElementById('producto-estilo').value.trim() || null,
    tipo_correa: document.getElementById('producto-tipo-correa').value.trim() || null,
    color_correa: document.getElementById('producto-color-correa').value.trim() || null,
    diseno_esfera: document.getElementById('producto-diseno-esfera').value.trim() || null,
    stock_minimo: parseInt(document.getElementById('producto-stock-minimo').value, 10) || 0,
  }).eq('id', id);

  if (error) {
    alert('Error al guardar los cambios: ' + error.message);
    return;
  }

  cerrarModal('modal-producto');
  cargarStock();
  cargarDashboard();
});

async function eliminarProducto(id) {
  if (!confirm('¿Eliminar este reloj del catálogo? Esta acción no se puede deshacer.')) return;

  const { error } = await supabaseClient.from('productos').delete().eq('id', id);

  if (error) {
    alert('No se puede eliminar: este reloj ya tiene ventas o compras registradas en su historial. Si querés, editalo para corregir sus datos en vez de borrarlo.');
    return;
  }

  cargarStock();
  cargarDashboard();
}

/* =========================================================
   VENTAS
   ========================================================= */
function abrirModalNuevaVenta() {
  document.getElementById('venta-id').value = '';
  document.getElementById('modal-venta-titulo').textContent = 'Registrar venta';
  document.getElementById('modal-venta-btn').textContent = 'Guardar venta';
  cargarProductosEnSelect('venta-producto', true);
  document.getElementById('modal-venta').classList.add('show');
}

async function abrirModalEditarVenta(id) {
  const { data: v } = await supabaseClient.from('ventas').select('*').eq('id', id).single();
  if (!v) return;

  document.getElementById('modal-venta-titulo').textContent = 'Editar venta';
  document.getElementById('modal-venta-btn').textContent = 'Guardar cambios';
  await cargarProductosEnSelect('venta-producto', true, v.producto_id);

  document.getElementById('venta-id').value = v.id;
  document.getElementById('venta-cantidad').value = v.cantidad;
  document.getElementById('venta-precio').value = v.precio_unitario;
  document.getElementById('venta-cliente-nombre').value = v.cliente_nombre || '';
  document.getElementById('venta-cliente-telefono').value = v.cliente_telefono || '';
  document.getElementById('venta-metodo-pago').value = v.metodo_pago || 'efectivo';

  document.getElementById('modal-venta').classList.add('show');
}

document.getElementById('form-venta').addEventListener('submit', async (e) => {
  e.preventDefault();

  const idVenta = document.getElementById('venta-id').value;
  const idProducto = document.getElementById('venta-producto').value;
  const cantidad = parseInt(document.getElementById('venta-cantidad').value, 10);
  const precioUnitario = parseFloat(document.getElementById('venta-precio').value);
  const total = cantidad * precioUnitario;

  if (!idProducto) {
    alert('Elegí un reloj.');
    return;
  }

  const datosVenta = {
    producto_id: idProducto,
    cantidad,
    precio_unitario: precioUnitario,
    total,
    cliente_nombre: document.getElementById('venta-cliente-nombre').value.trim() || null,
    cliente_telefono: document.getElementById('venta-cliente-telefono').value.trim() || null,
    metodo_pago: document.getElementById('venta-metodo-pago').value,
  };

  const { data: producto } = await supabaseClient
    .from('productos')
    .select('stock_actual')
    .eq('id', idProducto)
    .single();

  if (!producto) return;

  if (idVenta) {
    // Edición: calculamos la diferencia respecto a la cantidad anterior
    const { data: ventaOriginal } = await supabaseClient
      .from('ventas')
      .select('cantidad, producto_id')
      .eq('id', idVenta)
      .single();

    // Si cambiaron de reloj, devolvemos el stock al original y descontamos del nuevo
    const stockDisponibleParaEsteReloj = ventaOriginal.producto_id === idProducto
      ? producto.stock_actual + ventaOriginal.cantidad
      : producto.stock_actual;

    if (stockDisponibleParaEsteReloj < cantidad) {
      alert(`Stock insuficiente. Disponible: ${stockDisponibleParaEsteReloj}`);
      return;
    }

    const { error } = await supabaseClient.from('ventas').update(datosVenta).eq('id', idVenta);
    if (error) { alert('Error al guardar los cambios: ' + error.message); return; }

    // Devolver stock del reloj original de la venta
    await supabaseClient
      .from('productos')
      .update({ stock_actual: (await stockDe(ventaOriginal.producto_id)) + ventaOriginal.cantidad })
      .eq('id', ventaOriginal.producto_id);

    // Descontar del reloj nuevo (puede ser el mismo)
    await supabaseClient
      .from('productos')
      .update({ stock_actual: (await stockDe(idProducto)) - cantidad })
      .eq('id', idProducto);

  } else {
    // Venta nueva
    if (producto.stock_actual < cantidad) {
      alert(`Stock insuficiente. Disponible: ${producto.stock_actual}`);
      return;
    }

    const { error } = await supabaseClient.from('ventas').insert([datosVenta]);
    if (error) { alert('Error al registrar la venta: ' + error.message); return; }

    await supabaseClient
      .from('productos')
      .update({ stock_actual: producto.stock_actual - cantidad })
      .eq('id', idProducto);
  }

  cerrarModal('modal-venta');
  cargarVentas();
  cargarDashboard();
  if (seccionActual === 'stock') cargarStock();
});

async function eliminarVenta(id) {
  if (!confirm('¿Eliminar esta venta? El stock del reloj se va a devolver automáticamente.')) return;

  const { data: venta } = await supabaseClient.from('ventas').select('*').eq('id', id).single();
  if (!venta) return;

  const { error } = await supabaseClient.from('ventas').delete().eq('id', id);
  if (error) { alert('Error al eliminar la venta: ' + error.message); return; }

  const stockActual = await stockDe(venta.producto_id);
  await supabaseClient.from('productos').update({ stock_actual: stockActual + venta.cantidad }).eq('id', venta.producto_id);

  cargarVentas();
  cargarDashboard();
  if (seccionActual === 'stock') cargarStock();
}

// Helper: trae el stock_actual más reciente de un producto
async function stockDe(idProducto) {
  const { data } = await supabaseClient.from('productos').select('stock_actual').eq('id', idProducto).single();
  return data?.stock_actual ?? 0;
}

/* =========================================================
   COMPRAS
   ========================================================= */
function abrirModalNuevaCompra() {
  document.getElementById('compra-id').value = '';
  document.getElementById('modal-compra-titulo').textContent = 'Registrar compra a proveedor';
  document.getElementById('modal-compra-btn').textContent = 'Guardar compra';
  cargarProductosEnSelect('compra-producto', false);
  cargarProveedoresEnSelect('compra-proveedor');
  document.getElementById('compra-fecha').value = new Date().toISOString().slice(0, 10);
  document.getElementById('modal-compra').classList.add('show');
}

async function abrirModalEditarCompra(id) {
  const { data: c } = await supabaseClient.from('compras').select('*').eq('id', id).single();
  if (!c) return;

  document.getElementById('modal-compra-titulo').textContent = 'Editar compra';
  document.getElementById('modal-compra-btn').textContent = 'Guardar cambios';
  await cargarProductosEnSelect('compra-producto', false, c.producto_id);
  await cargarProveedoresEnSelect('compra-proveedor', c.proveedor_id);

  document.getElementById('compra-id').value = c.id;
  document.getElementById('compra-cantidad').value = c.cantidad;
  document.getElementById('compra-precio').value = c.precio_unitario;
  document.getElementById('compra-fecha').value = c.fecha_compra;
  document.getElementById('compra-factura').value = c.numero_factura || '';

  document.getElementById('modal-compra').classList.add('show');
}

document.getElementById('form-compra').addEventListener('submit', async (e) => {
  e.preventDefault();

  const idCompra = document.getElementById('compra-id').value;
  const idProducto = document.getElementById('compra-producto').value;
  const idProveedor = document.getElementById('compra-proveedor').value;
  const cantidad = parseInt(document.getElementById('compra-cantidad').value, 10);
  const precioUnitario = parseFloat(document.getElementById('compra-precio').value);

  if (!idProducto || !idProveedor) {
    alert('Elegí el proveedor y el reloj.');
    return;
  }

  const datosCompra = {
    proveedor_id: idProveedor,
    producto_id: idProducto,
    cantidad,
    precio_unitario: precioUnitario,
    fecha_compra: document.getElementById('compra-fecha').value,
    numero_factura: document.getElementById('compra-factura').value.trim() || null,
  };

  if (idCompra) {
    const { data: compraOriginal } = await supabaseClient
      .from('compras')
      .select('cantidad, producto_id')
      .eq('id', idCompra)
      .single();

    const { error } = await supabaseClient.from('compras').update(datosCompra).eq('id', idCompra);
    if (error) { alert('Error al guardar los cambios: ' + error.message); return; }

    // Deshacer el ingreso original y volver a aplicar el nuevo
    const stockOriginal = await stockDe(compraOriginal.producto_id);
    await supabaseClient
      .from('productos')
      .update({ stock_actual: Math.max(0, stockOriginal - compraOriginal.cantidad) })
      .eq('id', compraOriginal.producto_id);

    const stockNuevo = await stockDe(idProducto);
    await supabaseClient
      .from('productos')
      .update({ stock_actual: stockNuevo + cantidad })
      .eq('id', idProducto);

  } else {
    const { error } = await supabaseClient.from('compras').insert([datosCompra]);
    if (error) { alert('Error al registrar la compra: ' + error.message); return; }

    const stockActual = await stockDe(idProducto);
    await supabaseClient.from('productos').update({ stock_actual: stockActual + cantidad }).eq('id', idProducto);
  }

  cerrarModal('modal-compra');
  cargarCompras();
  cargarDashboard();
  if (seccionActual === 'stock') cargarStock();
});

async function eliminarCompra(id) {
  if (!confirm('¿Eliminar esta compra? El stock del reloj se va a descontar automáticamente (se deshace el ingreso).')) return;

  const { data: compra } = await supabaseClient.from('compras').select('*').eq('id', id).single();
  if (!compra) return;

  const { error } = await supabaseClient.from('compras').delete().eq('id', id);
  if (error) { alert('Error al eliminar la compra: ' + error.message); return; }

  const stockActual = await stockDe(compra.producto_id);
  await supabaseClient
    .from('productos')
    .update({ stock_actual: Math.max(0, stockActual - compra.cantidad) })
    .eq('id', compra.producto_id);

  cargarCompras();
  cargarDashboard();
  if (seccionActual === 'stock') cargarStock();
}

/* =========================================================
   PROVEEDORES
   ========================================================= */
function abrirModalNuevoProveedor() {
  document.getElementById('proveedor-id').value = '';
  document.getElementById('modal-proveedor-titulo').textContent = 'Nuevo proveedor';
  document.getElementById('modal-proveedor-btn').textContent = 'Guardar proveedor';
  document.getElementById('modal-proveedor').classList.add('show');
}

async function abrirModalEditarProveedor(id) {
  const { data: p } = await supabaseClient.from('proveedores').select('*').eq('id', id).single();
  if (!p) return;

  document.getElementById('modal-proveedor-titulo').textContent = 'Editar proveedor';
  document.getElementById('modal-proveedor-btn').textContent = 'Guardar cambios';

  document.getElementById('proveedor-id').value = p.id;
  document.getElementById('proveedor-nombre').value = p.nombre || '';
  document.getElementById('proveedor-contacto').value = p.contacto || '';
  document.getElementById('proveedor-telefono').value = p.telefono || '';
  document.getElementById('proveedor-correo').value = p.correo || '';
  document.getElementById('proveedor-direccion').value = p.direccion || '';

  document.getElementById('modal-proveedor').classList.add('show');
}

document.getElementById('form-proveedor').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('proveedor-id').value;

  const datos = {
    nombre: document.getElementById('proveedor-nombre').value.trim(),
    contacto: document.getElementById('proveedor-contacto').value.trim() || null,
    telefono: document.getElementById('proveedor-telefono').value.trim() || null,
    correo: document.getElementById('proveedor-correo').value.trim() || null,
    direccion: document.getElementById('proveedor-direccion').value.trim() || null,
  };

  const { error } = id
    ? await supabaseClient.from('proveedores').update(datos).eq('id', id)
    : await supabaseClient.from('proveedores').insert([{ ...datos, estado: 'activo' }]);

  if (error) {
    alert('Error al guardar el proveedor: ' + error.message);
    return;
  }

  cerrarModal('modal-proveedor');
  cargarProveedores();
});

async function eliminarProveedor(id) {
  if (!confirm('¿Eliminar este proveedor?')) return;

  const { error } = await supabaseClient.from('proveedores').delete().eq('id', id);

  if (error) {
    alert('No se puede eliminar: este proveedor ya tiene compras registradas en su historial. Podés desactivarlo en su lugar.');
    return;
  }

  cargarProveedores();
}