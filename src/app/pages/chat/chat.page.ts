import { Component, OnInit, ViewChild, viewChild } from '@angular/core';
import {IonContent} from '@ionic/angular';
import {Observable} from 'rxjs';
import {ChatService} from '../../services/chat.service';
import {Router} from '@angular/router';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
})
export class ChatPage implements OnInit {
  @ViewChild(IonContent, {static: false}) content!: IonContent;

  messages: Observable<any[]> | null = null;
  newMsg: string = '';

  constructor(
    private chatService: ChatService,
    private router: Router
  ) { }

  ngOnInit() {
    this.messages = this.chatService.getChatMessages();
  }

  async sendMessage(): Promise<void>{
    this.chatService.addChatMessage(this.newMsg).then(()=>{
      this.newMsg = '';
      this.content.scrollToBottom();
    })
  }

  signOut(){
    this.chatService.logout().then(()=>{
      this.router.navigateByUrl('/',{replaceUrl: true});
    })
  }

  async sendLocation(): Promise<void>{
    try {
      const {lat, lng} = await this.chatService.getLocation();
      const locationMessage = `Mi ubicación actual: <a href="https://www.google.com/maps?q=${lat},${lng}" style="color:red;">https://www.google.com/maps?q=${lat},${lng}</a>`
      await this.chatService.addChatMessage(locationMessage);
      setTimeout(() => {
        if (this.content) {
          this.content.scrollToBottom(300);
        }
      }, 100);
    } catch (error) {
      console.error('Error al enviar la ubicación:', error);
    }
  }

  isHtmlMessage(msg: string): boolean {
    const htmlRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/; // Detecta enlaces <a>
    return htmlRegex.test(msg);
  }

}
