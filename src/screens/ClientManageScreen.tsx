import React from 'react';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { ClientListScreen } from './ClientListScreen';

type Props = StackScreenProps<RootStackParamList, 'ClientManage'>;

/** Stack wrapper around ClientListScreen for klient-CRUD. */
export function ClientManageScreen({ navigation }: Props) {
  return (
    <ClientListScreen
      navigation={navigation as never}
      route={{ key: 'ClientManage', name: 'Athletes', params: undefined }}
    />
  );
}
