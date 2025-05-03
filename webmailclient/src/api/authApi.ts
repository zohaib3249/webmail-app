import axiosClient from './axiosClient';
import { LoginCredentials, AuthResponse } from '../types';

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const formData = new FormData();
    formData.append('email', credentials.email);
    formData.append('password', credentials.password);
    
    const response = await axiosClient.post('/auth/login/', formData);
    return response.data;
  },
  
  getUserProfile: async () => {
    const response = await axiosClient.get('/me/profile');
    return response.data;
  },

  changePassword: async (payload: { current_password: string; new_password: string }) => {
    await axiosClient.patch('auth/change-password/', payload);
  },
  
  setDefaultMailbox: async (mailboxId: number) => {
    const formData = new FormData();
    formData.append('mailbox_id', mailboxId.toString());
    
    const response = await axiosClient.post('/me/set-default/', formData);
    return response.data;
  },


};

export default authApi;