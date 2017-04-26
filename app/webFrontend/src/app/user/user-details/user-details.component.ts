import { Component, OnInit } from '@angular/core';
import {UserDataService} from '../../shared/data.service';
import {Router} from '@angular/router';
import {User} from '../../models/user';
import {UserService} from '../../shared/user.service';

@Component({
  selector: 'app-user-details',
  templateUrl: './user-details.component.html',
  styleUrls: ['./user-details.component.scss']
})
export class UserDetailsComponent implements OnInit {

  user: any[];

  constructor(private userService: UserService,
              private userDataService: UserDataService,
              private router: Router) {
    if(this.router.url === '/profile') {
      const userId = this.userService.getCurrentUserId();
      this.getUser(userId);
    }
  }

  ngOnInit() {
  }

  getUser(userId: string) {
    this.userDataService.readSingleItem(userId).then((user) => {
      this.user = user;
    });
  }

}
