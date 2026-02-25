import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from "@angular/router";
import { routes } from '../../../app.routes';

interface MenuItem {
  title: string,
  route: string,
}

const reactiveItems = routes[1].children ?? [];

@Component({
  selector: 'app-side-menu',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './side-menu.html',
})
export class SideMenu {

  reactiveMenu: MenuItem[] = reactiveItems
  .filter((item) => item.path != '**')
  .map((item) => ({
    route: `usuario/${item.path}`,
    title: `${item.title}`
  }))

  ccountryMenu: MenuItem[] = [{
    title: 'Paises',
    route: './country'
  }]
  
}
