import { Injectable } from '@angular/core';
import {
  Auth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from '@angular/fire/auth';
import {
  Firestore, 
  doc,  
  setDoc, 
  collection,
  addDoc,
  onSnapshot,
  getDocs,
  query,
  orderBy
} from '@angular/fire/firestore';
import * as firebase from 'firebase/app';
import {switchMap, map} from 'rxjs/operators'
import {from, Observable, BehaviorSubject} from 'rxjs'
import { serverTimestamp } from 'firebase/firestore';
import {Geolocation} from '@capacitor/geolocation'

export interface User{
  uid: string;
  email: string;
}

export interface Message{
  createdAt: any,
  id: string;
  from: string;
  msg: string;
  fromName: string;
  myMsg: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private messagesSubject = new BehaviorSubject<any[]>([]); // Observable para los mensajes
  currentUser: User | null = null;

  constructor(private afAuth: Auth, private firestore: Firestore){
    this.afAuth.onAuthStateChanged((user)=>{
      if(user){
        this.currentUser = {uid: user?.uid || '', email: user?.email || ''};
      }else{
        this.currentUser = null;
      }
    })
  }

  async signup({ email, password }: { email: string; password: string }): Promise<any> {
    try {
      const credential = await createUserWithEmailAndPassword(this.afAuth, email, password);
      const uid = credential.user.uid;
      
      const userDocRef = doc(this.firestore, `users/${uid}`)
      await setDoc(userDocRef,{uid, email: credential.user.email})
      
      return{uid, email: credential.user.email}
    } catch (e) {
      return null;
    }
  }

  async login({ email, password }: { email: string; password: string }){
    try {
      const user = await signInWithEmailAndPassword(this.afAuth, email, password);
      return user;
    } catch (e) {
      return null;
    }
  }

  logout(): Promise<any> {
    return signOut(this.afAuth);
  }

  async addChatMessage(msg: string): Promise <void>{
    try {
      const messagesCollection = collection(this.firestore, "messages")
      await addDoc(messagesCollection,{
        msg, 
        from: this.currentUser?.uid,
        createdAt: serverTimestamp()
      })
    } catch (error) {
      console.error("Error agregando mensaje", error);
      throw error;
    }
  }  


  getChatMessages(): Observable<Message[]> {
    return this.getUsers().pipe(
      switchMap((users) => {
        const messagesQuery = query(
          collection(this.firestore, 'messages'),
          orderBy('createdAt')
        );
  
        // Usar onSnapshot para actualizaciones en tiempo real
        return new Observable<Message[]>((observer) => {
          const unsubscribe = onSnapshot(
            messagesQuery,
            (querySnapshot) => {
              const messages = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...(doc.data() as Omit<Message, 'id' | 'fromName' | 'myMsg'>),
                fromName: this.getUserForMsg(doc.data()['from'], users),
                myMsg: this.currentUser?.uid === doc.data()['from'],
              }));
              observer.next(messages);
            },
            (error) => observer.error(error)
          );
  
          // Limpieza al desuscribir
          return () => unsubscribe();
        });
      })
    );
  }
  

  private getUsers(): Observable<User[]>{
    const usersCollection = collection(this.firestore, 'users')
    return from(getDocs(usersCollection)).pipe(
      map((querySnapshot) => querySnapshot.docs.map((doc)=>({
        uid: doc.id,
        ...(doc.data() as Omit<User, 'uid'>),
      })))
    )
  }


  private getUserForMsg(msgFromId: string, users: User[]): string{
    const user = users.find((user)=> user.uid === msgFromId);
    return user ? user.email : 'Deleted';
  }

  async getLocation (): Promise<{lat: number, lng: number}>{
    try {
      const position = await Geolocation.getCurrentPosition();
      console.log("Current Position: ", position);
      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
    } catch (error) {
      console.error("Error obteniendo ubicacion: ", error);
      throw error;
    }
  }


}
