import { Component, inject } from '@angular/core';
import { ConfirmService } from '../../services/confirm.service';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  templateUrl: './confirm-modal.component.html',
  styleUrls: ['./confirm-modal.component.css'],
})
export class ConfirmModalComponent {
  readonly confirmService = inject(ConfirmService);
}
