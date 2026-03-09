import { Routes } from "@angular/router";
import { ListarPage } from "./pages/usuario-listar/usuario-listar"
import { RegistrarPage } from "./pages/usuario-registrar/usuario-registrar"
import { ActualizarUsuarioPageComponent } from "./pages/usuario-actualizar/usuario-actualizar"

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
