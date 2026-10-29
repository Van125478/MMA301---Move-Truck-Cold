export type RootStackParamList = {
  Landing: undefined;
  GuestSaved: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email: string; resetCode?: string };
  ChangePassword: undefined;
  Workspace: undefined;
  ShipmentDetail: { id: string };
  Notifications: undefined;
  ChatInbox: undefined;
};
