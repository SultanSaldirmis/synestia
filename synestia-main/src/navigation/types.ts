import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Home: undefined;
  Explore: undefined;
  Profile: undefined;
  Notifications: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Detail: {
    id: string;
    title: string;
    category: 'music' | 'movie' | 'book' | 'text';
    description?: string;
    imageUrl?: string;
    body?: string;
    authorUid?: string;
    authorName?: string;
    commentCount?: number;
  };
  EditProfile: undefined;
  FollowList: { mode: 'followers' | 'following' | 'collections'; userId?: string };
  CreatePost: undefined;
  UserProfile: { userId: string };
  CollectionDetail: {
    userId: string;
    collectionId: string;
    collectionName: string;
    collectionType?: 'film' | 'music' | 'book' | 'mixed';
  };
  MusicPlayer: undefined;
  ItemDetail: {
    itemType: 'book' | 'movie';
    itemId: string;
    title: string;
    imageUrl?: string;
  };
  CrudTest: undefined;
};

/** Tab + stack ekranları */
export type RootStackParamList = AppStackParamList;
