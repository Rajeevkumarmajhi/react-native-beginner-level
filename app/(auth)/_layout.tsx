import React from 'react'
import { Stack, Redirect } from 'expo-router'
import Loader from '@/components/Loader'
import { StatusBar } from 'expo-status-bar'
import { useGlobalContext } from "../../context/GlobalProvider";

const AuthLayout = () => {
  // const { loading, isLogged } = useGlobalContext();

  // if (!loading && isLogged) return <Redirect href="/home" />;
  return (
    <>
      <Stack>
        <Stack.Screen
          name="sign-in"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="sign-up"
          options={{
            headerShown: false,
          }}
        />
      </Stack>

      {/* <Loader isLoading={loading} /> */}
      <StatusBar backgroundColor="#161622" style="light" />
    </>
  )
}

export default AuthLayout