import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SideMenuHeaderComponent } from './side-menu-header/side-menu-header.component';
import { SideMenuOptionsComponent } from './side-menu-options/side-menu-options.component';

@Component({
  selector: 'app-side-menu',
  standalone: true,
  imports: [SideMenuHeaderComponent, SideMenuOptionsComponent],
  templateUrl: './side-menu.component.html',
})
export class SideMenuComponent {
  @Input() isOpen = false;
  @Output() closeMenu = new EventEmitter<void>();

  closeSideMenu() {
    this.closeMenu.emit();
  }
}
