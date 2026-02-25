import { Component, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SideMenuComponent } from "../../components/side-menu/side-menu.component";

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [RouterOutlet, SideMenuComponent],
  templateUrl: './dashboard-page.component.html',
})
export default class DashboardPageComponent {
  isMenuOpen = false;
  isDesktop = window.innerWidth >= 768;

  @HostListener('window:resize')
  onResize() {
    this.isDesktop = window.innerWidth >= 768;
    if (this.isDesktop) {
      this.isMenuOpen = true;
    } else {
      this.isMenuOpen = false;
    }
  }

  ngOnInit() {
    this.isMenuOpen = this.isDesktop;
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }
}
