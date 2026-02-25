import { Routes } from "@angular/router";
import { ListarPage } from "./pages/listar-page/listar-page"
import { RegistrarPage } from "./pages/registrar-page/registrar-page"
import { ActualizarUsuarioPageComponent } from "./pages/actualizar-page/actualizar-page"

export const usuarioRoutes: Routes = [
  {
    path: '',
    children:[
      {
        path: 'registrar',
        title: 'Registrar',
        component: RegistrarPage
      },
      {
        path: 'listar',
        title: 'Listar',
        component: ListarPage
      },
     {
      path: 'actualizar/:id',
      title: 'Actualizar',
      component: ActualizarUsuarioPageComponent
      },
      {
        path: '**',
        redirectTo: 'registrar'
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
]
