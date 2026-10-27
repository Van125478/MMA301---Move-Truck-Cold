export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email: string; resetCode?: string };
  ChangePassword: undefined;
  Home: undefined;
  ShipmentList: undefined;
  ShipmentDetail: { id: string };
};
