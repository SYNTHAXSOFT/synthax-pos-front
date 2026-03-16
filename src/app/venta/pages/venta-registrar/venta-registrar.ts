import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { VentaService } from '../../services/venta.service';
import { VentaRequest } from '../../interfaces/venta.interface';
import { MesaService } from '../../../mesa/services/mesa.service';
import { TipoPedidoService } from '../../../tipo-pedido/services/tipo-pedido.service';
import { UsuarioService } from '../../../usuario/services/usuario.service';
import { AuthService } from '../../../auth/services/auth.service';
import { Mesa } from '../../../mesa/interfaces/mesa.interface';
import { TipoPedido } from '../../../tipo-pedido/interfaces/tipo-pedido.interface';
import { Usuario } from '../../../usuario/interfaces/usuario.interface';
import { VentaListarPageComponent } from '../venta-listar/venta-listar';

@Component({
  selector: 'app-venta-registrar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, VentaListarPageComponent],
  templateUrl: './venta-registrar.html',
  styleUrls: ['../../../shared/styles/spx-forms.css'],
})
export class VentaRegistrarPageComponent implements OnInit {
  private readonly fb               = inject(FormBuilder);
  private readonly ventaService     = inject(VentaService);
  private readonly mesaService      = inject(MesaService);
  private readonly tipoPedidoService= inject(TipoPedidoService);
  private readonly usuarioService   = inject(UsuarioService);
  private readonly authService      = inject(AuthService);

  @ViewChild(VentaListarPageComponent) listarComponent?: VentaListarPageComponent;

  public mesas:       Mesa[]      = [];
  public tiposPedido: TipoPedido[]= [];
  public clientes:    Usuario[]   = [];

  public myForm: FormGroup = this.fb.group({
    tipoPedidoId:               [null, [Validators.required]],
    mesaId:                     [null],
    solicitaFacturaElectronica: [false],
    usuarioClienteId:           [null],
  });

  ngOnInit(): void {
    this.cargarCatalogos();
  }

  get solicitaFactura(): boolean {
    return !!this.myForm.get('solicitaFacturaElectronica')?.value;
  }

  cargarCatalogos(): void {
    this.mesaService.obtenerActivos().subscribe({ next: (d) => this.mesas = d });
    this.tipoPedidoService.obtenerActivos().subscribe({ next: (d) => this.tiposPedido = d });
    this.usuarioService.listarUsuarios().subscribe({ next: (d) => this.clientes = d });
  }

  onSave(): void {
    // Si solicitó factura, el cliente es obligatorio
    if (this.solicitaFactura && !this.myForm.value.usuarioClienteId) {
      alert('Debe seleccionar un cliente cuando se solicita factura electrónica.');
      return;
    }

    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched();
      return;
    }

    const v = this.myForm.value;
    const currentUserId = this.authService.getUserId();

    if (!currentUserId) {
      alert('No se pudo obtener el usuario activo. Por favor inicie sesión nuevamente.');
      return;
    }

    const payload: VentaRequest = {
      tipoPedido:                 { id: v.tipoPedidoId },
      usuarioCreador:             { id: currentUserId },
      solicitaFacturaElectronica: v.solicitaFacturaElectronica ?? false,
      estado:                     'ABIERTA',
      activo:                     true,
      ...(v.mesaId           ? { mesa:           { id: v.mesaId           } } : {}),
      ...(v.usuarioClienteId ? { usuarioCliente: { id: v.usuarioClienteId } } : {}),
    };

    this.ventaService.crear(payload).subscribe({
      next: () => {
        alert('Venta creada exitosamente');
        this.myForm.reset({ solicitaFacturaElectronica: false });
        this.listarComponent?.cargarVentas();
      },
      error: (err) => {
        console.error('Error:', err);
        alert('Error al crear la venta: ' + (err.error?.error || 'Error desconocido'));
      },
    });
  }

  isValidField(field: string): boolean | null {
    return this.myForm.controls[field].errors && this.myForm.controls[field].touched;
  }
}
