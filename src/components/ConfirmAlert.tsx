import { IonAlert } from '@ionic/react';

interface ConfirmAlertProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
}

export default function ConfirmAlert({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'CONFIRM'
}: ConfirmAlertProps) {
  return (
    <IonAlert
      isOpen={isOpen}
      onDidDismiss={onClose}
      header={title}
      message={message}
      buttons={[
        {
          text: 'CANCEL',
          role: 'cancel'
        },
        {
          text: confirmText,
          handler: onConfirm
        }
      ]}
    />
  );
}