import React, { useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, ListRenderItem } from "react-native";
import pt from "date-fns/locale/pt";
import { useAuth } from "../../hooks/auth";
import { format } from "date-fns";
import Toast from "react-native-toast-message";

import { HighlightCard } from "../../components/HighlightCard";
import {
  TransactionCard,
  TransactionCardProps,
} from "../../components/TransactionCard";

import * as S from "./styles";
import theme from "../../global/styles/theme";

import { Transaction } from "../../types/transaction";

import { formatToBRL } from "../../utils/formatBRL";
import { numberify } from "../../utils/numberify";
import { formatTotalIntervalMessage } from "../../utils/formatTotalIntervalMessage";

export type DataListProps = {
  id: string;
} & Transaction;

type HighlightProps = {
  amount: string;
  lastTransaction: string;
};

type HighlightData = {
  entries: HighlightProps;
  expensives: HighlightProps;
  total: HighlightProps;
};

export function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<DataListProps[]>();
  const [highlightData, setHighlightData] = useState<HighlightData>(
    {} as HighlightData
  );
  const { logOut, user } = useAuth();

  const loadTransactions = async () => {
    const dataKey = `@gofinances:transactions_user:${user?.id}`;
    const response = await AsyncStorage.getItem(dataKey);
    const data = response ? JSON.parse(response) : [];

    const transactions: DataListProps[] = data.map((item: DataListProps) => {
      const amount = formatToBRL(+item.amount);

      return {
        ...item,
        amount,
      };
    });

    const transactionsTimes = transactions.map((transaction) =>
      new Date(transaction.date).getTime()
    );

    const entries = transactions.filter((item) => item.type === "positive");
    const entriesTotal = entries.reduce(
      (acc, item) => acc + numberify(item.amount),
      0
    );
    const entriesTimes = entries.map((item) => new Date(item.date).getTime());
    const lastEntryDate =
      entries.length >= 1
        ? format(
            Math.max.apply(Math, entriesTimes),
            "'Última entrada dia' dd 'de' MMMM'",
            {
              locale: pt,
            }
          )
        : "Sem entradas recentes";

    const expansives = transactions.filter((item) => item.type === "negative");
    const expensivesTotal = expansives.reduce(
      (acc, item) => acc + numberify(item.amount),
      0
    );
    const expansivesTimes = expansives.map((item) =>
      new Date(item.date).getTime()
    );

    const lastExpensiveDate =
      expansives.length >= 1
        ? format(
            Math.max.apply(Math, expansivesTimes),
            "'Última saída dia' dd 'de' MMMM'",
            {
              locale: pt,
            }
          )
        : "Sem saídas recentes";

    const firstTransactionDate = Math.min.apply(Math, transactionsTimes);
    const lastTransactionDate = Math.max.apply(Math, transactionsTimes);

    const totalInterval =
      transactions.length >= 1
        ? formatTotalIntervalMessage(firstTransactionDate, lastTransactionDate)
        : "Sem transações recentes";

    setTransactions(transactions);

    setHighlightData({
      entries: {
        amount: formatToBRL(entriesTotal),
        lastTransaction: lastEntryDate,
      },
      expensives: {
        amount: formatToBRL(expensivesTotal),
        lastTransaction: lastExpensiveDate,
      },
      total: {
        amount: formatToBRL(entriesTotal - expensivesTotal),
        lastTransaction: totalInterval,
      },
    });
    setIsLoading(false);
  };

  const handleDeleteTransaction = async (id: string) => {
    const newTransactions = transactions!.filter((item) => item.id !== id);
    setTransactions(newTransactions);

    const dataKey = `@gofinances:transactions_user:${user?.id}`;
    const storage = await AsyncStorage.getItem(dataKey);
    const transactionsStorage: DataListProps[] = storage
      ? JSON.parse(storage)
      : [];

    const newTransactionsStorage = transactionsStorage.filter(
      (item) => item.id !== id
    );

    await AsyncStorage.setItem(dataKey, JSON.stringify(newTransactionsStorage));
    loadTransactions();

    Toast.show({
      type: "success",
      text1: "Transação removida com sucesso",
    });
  };

  const renderItem: ListRenderItem<TransactionCardProps> = ({ item }) => (
    <TransactionCard
      {...item}
      onLongPress={() => handleDeleteTransaction(item.id)}
    />
  );

  useEffect(() => {
    loadTransactions();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [])
  );

  return (
    <S.Container>
      {isLoading ? (
        <S.LoadContainer>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </S.LoadContainer>
      ) : (
        <>
          <S.Header>
            <S.UserContainer>
              <S.UserInfo>
                <S.UserAvatar
                  source={{
                    uri: user?.photo,
                  }}
                />
                <S.User>
                  <S.UserWelcome>Bem vindo,</S.UserWelcome>
                  <S.UserName>{user?.name}</S.UserName>
                </S.User>
              </S.UserInfo>
              <S.Icon name="power" size={24} onPress={logOut} />
            </S.UserContainer>
          </S.Header>

          <S.HighlightCards>
            <HighlightCard
              title="Entradas"
              amount={highlightData.entries.amount}
              lastTransaction={highlightData.entries.lastTransaction}
              type="positive"
            />
            <HighlightCard
              title="Saídas"
              amount={highlightData.expensives.amount}
              lastTransaction={highlightData.expensives.lastTransaction}
              type="negative"
            />
            <HighlightCard
              title="Total"
              amount={highlightData.total.amount}
              lastTransaction={highlightData.total.lastTransaction}
              type="total"
            />
          </S.HighlightCards>

          <S.Transactions>
            <S.Title>
              {transactions && transactions.length >= 1
                ? "Histórico de transações"
                : "Não há transações recentes."}
            </S.Title>

            <S.TransactionsList
              data={transactions}
              renderItem={renderItem as ListRenderItem<unknown>}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
              keyExtractor={(item: any) => item.id as string}
            />
          </S.Transactions>
        </>
      )}
    </S.Container>
  );
}
