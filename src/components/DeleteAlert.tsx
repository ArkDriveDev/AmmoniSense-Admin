import { IonAlert } from '@ionic/react';

interface DeleteAlertProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  requireTypeConfirm?: boolean;
  typeConfirmText?: string;
}

export default function DeleteAlert({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'DELETE',
  requireTypeConfirm = false,
  typeConfirmText = 'DELETE'
}: DeleteAlertProps) {
  const handleConfirm = (data?: any) => {
    if (requireTypeConfirm) {
      const inputValue = data?.confirm || '';
      if (inputValue !== typeConfirmText) {
        return false;
      }
    }
    onConfirm();
    return true;
  };

  // Only include inputs if requireTypeConfirm is true
  const alertInputs = requireTypeConfirm
    ? [
        {
          name: 'confirm',
          type: 'text' as const,
          placeholder: `Type "${typeConfirmText}" to confirm`
        }
      ]
    : undefined;

  return (
    <IonAlert
      isOpen={isOpen}
      onDidDismiss={onClose}
      header={title}
      message={message}
      inputs={alertInputs}
      buttons={[
        {
          text: 'CANCEL',
          role: 'cancel'
        },
        {
          text: confirmText,
          role: 'destructive',
          handler: handleConfirm
        }
      ]}
    />
  );
}