import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../auth/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-side-menu-header',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './side-menu-header.component.html',
  styleUrls: ['./side-menu-header.component.css']
})
export class SideMenuHeaderComponent implements OnInit {

  envs = environment;
  private authService = inject(AuthService);
  private router = inject(Router);
  
  currentUser: any = null;
  homeRoute: string = '/synthax-votos';
  
  // Notificaciones
  notificationCount = 0;
  
  // Cache del candidatoId
  private cachedCandidatoId: number | null = null;

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    if (this.currentUser?.rol === 'CANDIDATO') {
        this.cachedCandidatoId = this.currentUser?.candidatoId || 
                                this.currentUser?.candidato_id || 
                                this.currentUser?.candidato?.id || 
                                null;
        
        if (this.cachedCandidatoId) {
            this.loadNotifications();
        }
    }
    
    this.homeRoute = this.authService.getDefaultRouteByRole();
    
    this.cachedCandidatoId = this.currentUser?.candidatoId || 
                            this.currentUser?.candidato_id || 
                            this.currentUser?.candidato?.id || 
                            null;
    
    if (this.cachedCandidatoId) {
      this.loadNotifications();
    }
  }

  get fullName(): string {
    if (!this.currentUser) return 'Usuario';
    return `${this.currentUser.nombre}`;
  }

  get userRole(): string {
    return this.currentUser?.rol || '';
  }

  getCurrentCandidatoId(): number {
    if (this.cachedCandidatoId) {
      return this.cachedCandidatoId;
    }
    
    const freshUser = this.authService.getCurrentUser();
    const candidatoId = freshUser?.candidatoId ||      
                       freshUser?.candidato_id ||     
                       freshUser?.candidato?.id ||    
                       null;
    
    if (candidatoId) {
      this.cachedCandidatoId = candidatoId;
    }
    
    return candidatoId || 1;
  }

  loadNotifications(): void {
    const candidatoId = this.getCurrentCandidatoId();
    
    if (!candidatoId || candidatoId === 0) {
      this.notificationCount = 0;
      return;
    }
  }

  irANotificaciones(): void {
    this.router.navigate(['/synthax-votos/notificaciones']);
  }
}