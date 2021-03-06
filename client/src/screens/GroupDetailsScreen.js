import React, { useState, useEffect, Fragment } from 'react';
import { connect } from 'react-redux';

import { useMutation, useQuery } from '@apollo/react-hooks';
import { StyleSheet, Image } from 'react-native';

import {
  Container,
  Header,
  Title,
  Content,
  Text,
  Button,
  Icon,
  List,
  ListItem,
  Left,
  Right,
  Body,
  Card,
  CardItem,
  Spinner,
  Thumbnail,
  Footer,
  FooterTab,
  Tabs,
  Tab,
  Toast,
} from 'native-base';
import { Grid, Col } from 'react-native-easy-grid';

import CreateGroupModal from '../components/CreateGroupModal';

import {
  GROUP_QUERY,
  USERS_QUERY,
  GROUPS_QUERY,
  ALL_GROUPS_QUERY,
} from '../graphql/queries';
import {
  ADD_USER_TO_GROUP_MUTATION,
  REMOVE_USER_FROM_GROUP_MUTATION,
  EDIT_GROUP_MUTATION,
  DELETE_GROUP_MUTATION,
} from '../graphql/mutations';

const GroupDetailsScreen = props => {
  const groupId = props.navigation.getParam('groupId');
  const [modal, setModal] = useState(false);
  const [tabs, setTabs] = useState([true, false]);

  const { ...groupQueryResult } = useQuery(GROUP_QUERY, {
    variables: { groupId },
  });

  const { ...usersQueryResult } = useQuery(USERS_QUERY, {
    variables: { id: props.auth.user.id },
  });

  const [editGroup, { ...mutationEditGroupResult }] = useMutation(
    EDIT_GROUP_MUTATION,
    {
      update(cache, { data }) {
        const { group } = cache.readQuery({
          query: GROUP_QUERY,
          variables: { groupId },
        });
        const newGroup = data.editGroup;
        const result = { group: { ...group, ...newGroup } };
        cache.writeQuery({
          query: GROUP_QUERY,
          data: result,
        });
      },
    },
  );

  const [deleteGroup, { ...mutationDeleteGroupResult }] = useMutation(
    DELETE_GROUP_MUTATION,
    {
      update(cache, { data }) {
        const { groups } = cache.readQuery({
          query: GROUPS_QUERY,
          variables: { userId: props.auth.user.id },
        });
        const newGroups = groups.filter(
          group => group.id !== data.deleteGroup.id,
        );
        const result = { groups: newGroups };
        cache.writeQuery({
          query: GROUPS_QUERY,
          variables: { userId: props.auth.user.id }, //needed
          data: result,
        });

        const { allGroups } = cache.readQuery({
          query: ALL_GROUPS_QUERY,
          variables: {},
        });
        const newGroups1 = allGroups.filter(
          group => group.id !== data.deleteGroup.id,
        );
        const result1 = { allGroups: newGroups1 };
        cache.writeQuery({
          query: ALL_GROUPS_QUERY,
          variables: {},
          data: result1,
        });
      },
    },
  );

  const [addUserToGroup, { ...mutationAddUserToGroupResult }] = useMutation(
    ADD_USER_TO_GROUP_MUTATION,
    {
      update(cache, { data }) {
        // first query
        const { group } = cache.readQuery({
          query: GROUP_QUERY,
          variables: { groupId },
        });
        const newUser = data.addUserToGroup;
        const newUsers = [...group.users, newUser];
        const result = { group: { ...group, users: newUsers } };
        cache.writeQuery({
          query: GROUP_QUERY,
          data: result,
        });
        /*
        //second query
        const { groups } = cache.readQuery({
          query: GROUPS_QUERY,
          variables: { userId: newUser.id },
        });

        const addedGroup = newUser.groups.find(group => group.id === groupId);
        const result1 = { groups: [...groups, addedGroup] };

        cache.writeQuery({
          query: GROUPS_QUERY,
          variables: { userId: newUser.id },
          data: result1,
        });*/
      },
    },
  );

  const [removeUserFromGroup, { ...mutationRemoveUserFromGroup }] = useMutation(
    REMOVE_USER_FROM_GROUP_MUTATION,
    {
      update(cache, { data }) {
        // first query
        const { group } = cache.readQuery({
          query: GROUP_QUERY,
          variables: { groupId },
        });
        const newUser = data.removeUserFromGroup;
        const newUsers = group.users.filter(user => user.id !== newUser.id);
        const result = { group: { ...group, users: newUsers } };
        cache.writeQuery({
          query: GROUP_QUERY,
          data: result,
        });
        /*
        //second query //leave/join group from another owner
        const { groups } = cache.readQuery({
          query: GROUPS_QUERY,
          variables: { userId: newUser.id },
        });

        const restGroups = groups.filter(group => group.id !== groupId);
        const result1 = { groups: [...restGroups] };

        cache.writeQuery({
          query: GROUPS_QUERY,
          variables: { userId: newUser.id },
          data: result1,
        });
*/
      },
    },
  );

  const loading = groupQueryResult.loading || usersQueryResult.loading;
  // mutationAddUserToGroupResult.loading ||
  // mutationRemoveUserFromGroup.loading;

  const error =
    groupQueryResult.error ||
    usersQueryResult.error ||
    mutationAddUserToGroupResult.error ||
    mutationRemoveUserFromGroup.error;

  if (loading) return <Spinner />;
  if (error) return <Text>{JSON.stringify(error, null, 2)}</Text>;

  function isUserInGroup(group, userId) {
    return group.users.map(user => user.id).includes(userId);
  }

  async function deleteGroupPress(groupId) {
    const { data } = await deleteGroup({ variables: { groupId } });
    props.navigation.goBack();
  }

  async function addUserToGroupPress(group, userId) {
    if (!isUserInGroup(group, userId)) {
      const { data } = await addUserToGroup({
        variables: { groupId: group.id, userId },
        refetchQueries: ['GroupsQuery'],
      });
      Toast.show({
        text: `${data.addUserToGroup.username} added to the group.`,
        buttonText: 'Ok',
        duration: 3000,
        type: 'success',
      });
    } else {
      const { data } = await removeUserFromGroup({
        variables: { groupId: group.id, userId },
        refetchQueries: ['GroupsQuery'],
      });
      Toast.show({
        text: `${data.removeUserFromGroup.username} removed from the group.`,
        buttonText: 'Ok',
        duration: 3000,
        type: 'success',
      });
    }
  }

  function toggleModal() {
    setModal(!modal);
  }
  function toggleTab1() {
    setTabs([true, false]);
  }
  function toggleTab2() {
    setTabs([false, true]);
  }
  const { users } = usersQueryResult.data;
  const { group } = groupQueryResult.data;

  return (
    <Container>
      <Header>
        <Left>
          <Button transparent onPress={() => props.navigation.goBack()}>
            <Icon name="arrow-back" />
          </Button>
        </Left>
        <Body>
          <Title>{group.name}</Title>
        </Body>
        <Right />
      </Header>
      <Content contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <CardItem>
            <Body>
              <Image source={{ uri: group.avatar }} style={styles.image} />
            </Body>
          </CardItem>
          <CardItem>
            <Text style={styles.ownerText}>Owner: {group.owner.username}</Text>
            <Text note>{group.isPrivate ? 'Private' : 'Public'}</Text>
          </CardItem>
          <CardItem>
            <Body>
              <Text style={styles.description}>{group.description}</Text>
            </Body>
          </CardItem>
          {group.owner.id === props.auth.user.id ? (
            <CardItem footer bordered>
              <Left>
                <Button small bordered onPress={() => setModal(true)}>
                  <Text>Edit</Text>
                </Button>
              </Left>
              <Right style={{ flex: 1 }}>
                <Button
                  onPress={() => deleteGroupPress(group.id)}
                  small
                  bordered>
                  <Text>Delete</Text>
                </Button>
              </Right>
            </CardItem>
          ) : (
            <CardItem footer bordered>
              <Left>
                <Button
                  small
                  bordered
                  onPress={() =>
                    addUserToGroupPress(group, props.auth.user.id)
                  }>
                  <Text>
                    {!isUserInGroup(group, props.auth.user.id)
                      ? 'Join'
                      : 'Leave'}
                  </Text>
                </Button>
              </Left>
            </CardItem>
          )}
          {group.owner.id !== props.auth.user.id && (
            <List>
              {group.users.map((user, index) => {
                return (
                  <ListItem style={styles.listItem} key={index} thumbnail>
                    <Left>
                      <Thumbnail source={{ uri: user.avatar }} />
                    </Left>
                    <Body>
                      <Text>{user.username}</Text>
                      <Text note numberOfLines={1}>
                        {user.description}
                      </Text>
                    </Body>
                  </ListItem>
                );
              })}
            </List>
          )}
          {group.owner.id === props.auth.user.id && (
            <Fragment>
              {tabs[0] && (
                <List>
                  {users.map((user, index) => {
                    return (
                      <ListItem style={styles.listItem} key={index} thumbnail>
                        <Left>
                          <Thumbnail source={{ uri: user.avatar }} />
                        </Left>
                        <Body>
                          <Text>{user.username}</Text>
                          <Text note numberOfLines={1}>
                            {user.description}
                          </Text>
                        </Body>
                        <Right>
                          <Button
                            small
                            bordered={!isUserInGroup(group, user.id)}
                            onPress={() => addUserToGroupPress(group, user.id)}>
                            <Text>
                              {isUserInGroup(group, user.id) ? 'Remove' : 'Add'}
                            </Text>
                          </Button>
                        </Right>
                      </ListItem>
                    );
                  })}
                </List>
              )}
              {tabs[1] && (
                <List>
                  {group.users.map((user, index) => {
                    return (
                      <Fragment key={index}>
                        {user.id !== props.auth.user.id && (
                          <ListItem style={styles.listItem}>
                            <Grid>
                              <Col size={1} style={styles.col}>
                                <Text style={{ alignSelf: 'flex-start' }}>
                                  {user.username}
                                </Text>
                              </Col>
                              <Col size={1}>
                                <Button
                                  onPress={() =>
                                    addUserToGroupPress(group, user.id)
                                  }
                                  small
                                  bordered
                                  style={styles.removeBanButton}>
                                  <Text>Remove</Text>
                                </Button>
                              </Col>
                              <Col size={1}>
                                <Button
                                  small
                                  bordered
                                  style={styles.removeBanButton}>
                                  <Text>Ban</Text>
                                </Button>
                              </Col>
                            </Grid>
                          </ListItem>
                        )}
                      </Fragment>
                    );
                  })}
                </List>
              )}
            </Fragment>
          )}
        </Card>
      </Content>
      {group.owner.id === props.auth.user.id && (
        <Footer>
          <FooterTab>
            <Button active={tabs[0]} onPress={() => toggleTab1()}>
              <Text style={styles.tabText}>All Users</Text>
            </Button>
            <Button active={tabs[1]} onPress={() => toggleTab2()}>
              <Text style={styles.tabText}>Group Users</Text>
            </Button>
          </FooterTab>
        </Footer>
      )}
      <CreateGroupModal
        editGroup={editGroup}
        isEdit={true}
        group={group}
        modal={modal}
        toggleModal={toggleModal}
      />
    </Container>
  );
};

const styles = StyleSheet.create({
  content: {},
  card: {},
  usernameText: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  image: {
    height: 100,
    width: null,
    alignSelf: 'stretch',
  },
  tabText: {
    fontSize: 12,
  },
  removeBanButton: {
    alignSelf: 'flex-end',
  },
  col: { justifyContent: 'center' },
  ownerText: { fontWeight: 'bold', marginRight: 5 },
  description: { fontSize: 14 },
  listItem: {
    marginLeft: 10,
  },
});

export default connect(
  state => ({
    auth: state.authReducer,
  }),
  null,
)(GroupDetailsScreen);
